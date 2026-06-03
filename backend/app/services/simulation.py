from sqlalchemy.orm import Session
from app import models, schemas
from app.services.ai import AIService
import datetime

class SimulationService:
    @staticmethod
    def create_simulation(db: Session, user_id: str, persona_id: str, scenario_type: str) -> models.Simulation:
        """Initializes a new simulation record in the database."""
        # Ensure user exists (create temporary mock user if needed)
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            user = models.User(id=user_id, email=f"{user_id}@example.com", first_name="Educator")
            db.add(user)
            db.commit()
            db.refresh(user)

        # Create simulation session
        sim = models.Simulation(
            user_id=user_id,
            persona_id=persona_id,
            scenario_type=scenario_type,
            status="in_progress",
            escalation_score=60 # Start at moderate stress
        )
        db.add(sim)
        db.commit()
        db.refresh(sim)

        # Add initial student trigger message based on scenario
        persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
        trigger_message = f"*Looks frustrated and sighs loudly* I'm not doing this. Why do we always have to write paragraphs?"
        
        if persona:
            if persona.name.lower() == "leo":
                trigger_message = "*stands up, walks around the room, taps others* Dinosaurs don't do math! I'm not sitting down!"
            elif persona.name.lower() == "maya":
                trigger_message = "*head down, hood up, whispering* I don't know the answers. Just leave me alone."
            elif persona.name.lower() == "jordan":
                trigger_message = "*scoffs, rolling eyes, looks at phone* This assignment is completely pointless. I'm not wasting my time."

        initial_msg = models.Message(
            simulation_id=sim.id,
            sender="student",
            content=trigger_message,
            escalation_change=0
        )
        db.add(initial_msg)
        db.commit()
        db.refresh(sim)
        return sim

    @staticmethod
    async def process_step(db: Session, simulation_id: str, educator_content: str) -> models.Simulation:
        """
        Appends the educator's input, runs the AI student agent response loop,
        updates the database, and returns the updated simulation instance.
        """
        sim = db.query(models.Simulation).filter(models.Simulation.id == simulation_id).first()
        if not sim or sim.status != "in_progress":
            return sim

        # 1. Add the educator's message
        educator_msg = models.Message(
            simulation_id=simulation_id,
            sender="educator",
            content=educator_content,
            escalation_change=0
        )
        db.add(educator_msg)
        db.commit()

        # 2. Get history for LLM prompt
        messages = db.query(models.Message).filter(models.Message.simulation_id == simulation_id).order_by(models.Message.created_at).all()
        history = [{"sender": m.sender, "content": m.content} for m in messages]

        # 3. Call AI Service
        persona = db.query(models.Persona).filter(models.Persona.id == sim.persona_id).first()
        persona_name = persona.name if persona else "student"
        persona_prompt = persona.base_prompt if persona else "You are a student."

        ai_response = await AIService.generate_student_response(
            persona_name=persona_name,
            persona_prompt=persona_prompt,
            history=history,
            current_stress=sim.escalation_score
        )

        # 4. Calculate stress difference
        new_stress = min(max(ai_response.get("stress_level", sim.escalation_score), 0), 100)
        escalation_change = new_stress - sim.escalation_score

        # 5. Add student response message
        student_msg = models.Message(
            simulation_id=simulation_id,
            sender="student",
            content=ai_response.get("dialogue", "..."),
            escalation_change=escalation_change
        )
        db.add(student_msg)

        # 6. Update simulation metadata
        sim.escalation_score = new_stress
        sim.updated_at = datetime.datetime.utcnow()
        
        # Auto-complete or auto-escalate thresholds
        if new_stress >= 100:
            sim.status = "abandoned" # Fully escalated/blown up
        elif new_stress <= 15:
            sim.status = "completed" # Successfully de-escalated

        db.commit()
        db.refresh(sim)
        return sim

    @staticmethod
    async def evaluate_simulation(db: Session, simulation_id: str) -> models.Feedback:
        """Concludes the simulation, evaluates performance, and creates feedback."""
        sim = db.query(models.Simulation).filter(models.Simulation.id == simulation_id).first()
        if not sim:
            return None

        # Check if already evaluated
        existing_feedback = db.query(models.Feedback).filter(models.Feedback.simulation_id == simulation_id).first()
        if existing_feedback:
            return existing_feedback

        # Set status to completed if not already abandoned or completed
        if sim.status == "in_progress":
            sim.status = "completed"
            db.commit()

        # Fetch messages history
        messages = db.query(models.Message).filter(models.Message.simulation_id == simulation_id).order_by(models.Message.created_at).all()
        history = [{"sender": m.sender, "content": m.content} for m in messages]

        # Call AI Evaluator
        feedback_data = await AIService.generate_coaching_feedback(history)

        # Write feedback report
        feedback = models.Feedback(
            simulation_id=simulation_id,
            empathy_score=feedback_data.get("empathy_score", 50),
            boundary_score=feedback_data.get("boundary_score", 50),
            traps_identified=feedback_data.get("traps_identified", []),
            traps_justification=feedback_data.get("traps_justification", {}),
            expert_comparison=feedback_data.get("expert_comparison", ""),
            constructive_advice=feedback_data.get("constructive_advice", "")
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        return feedback
