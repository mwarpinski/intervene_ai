from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from app.database import engine, Base, get_db
from app import models, schemas
from app.services.simulation import SimulationService
from app.services.ai import AIService
from app.utils import auth as auth_utils
import datetime

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Intervene AI API", version="1.0.0")

# Enable CORS for React local dev server (default port 5173) and any production builds
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all. Restrict in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Seed default personas on startup
@app.on_event("startup")
def seed_personas():
    db = next(get_db())
    try:
        personas_to_seed = [
            {
                "name": "Leo",
                "age": 6,
                "difficulty_level": "Beginner",
                "profile_details": "Leo is a 6-year-old who has ADHD. He struggles with transitions, is highly hyperactive, and loves dinosaurs. When asked to transition or clean up, he walks around, taps others, or makes dinosaur noises.",
                "base_prompt": (
                    "You are playing the role of Leo, a 6-year-old student who struggles with transitions. He is hyperactive and loves dinosaurs. "
                    "When the teacher asks you to clean up or do math, you react by running around or tap-tapping other desks. "
                    "If the teacher uses positive co-regulation, validation, or gives you choice ('You can clean up the red block or the green block'), you gradually comply. "
                    "If the teacher uses threats ('Clean up or no recess!') or sarcasm, you scream, run, and escalate. "
                    "CRITICAL: If the teacher's input is gibberish (random characters like 'asdfasdf') or completely off-topic nonsense (e.g. talking about crypto, sports, or shopping lists), you must remain in character but react with confusion, ask what they mean, or mock them for talking like a silly dinosaur. Do not cooperate or de-escalate. "
                    "Always respond like an energetic 6-year-old and append the JSON block containing 'dialogue', 'stress_level', and 'underlying_emotion' at the very end."
                )
            },
            {
                "name": "Maya",
                "age": 10,
                "difficulty_level": "Intermediate",
                "profile_details": "Maya is 10 and has a history of trauma. She shuts down, pulls her hood up, and refuses to talk when feeling academically overwhelmed or pressured. She is extremely sensitive to authoritative tones.",
                "base_prompt": (
                    "You are playing the role of Maya, a 10-year-old trauma-informed student. "
                    "When you feel overwhelmed by a math assignment, you shut down, pull your hood up, avoid eye contact, and doodle. "
                    "If the teacher checks in gently, validates your emotions ('I see this math is feeling hard Maya'), and keeps demands low-pressure, you slowly open up. "
                    "If the teacher demands compliance, yells, or threatens exclusions, you tuck your head down and refuse to speak at all. "
                    "CRITICAL: If the teacher's input is gibberish (random characters like 'asdfasdf') or completely off-topic nonsense (e.g. talking about crypto, sports, or shopping lists), you must remain in character but react with confusion, get scared/suspicious, or refuse to talk. Do not cooperate or de-escalate. "
                    "Always respond like a withdrawn 10-year-old and append the JSON block containing 'dialogue', 'stress_level', and 'underlying_emotion' at the very end."
                )
            },
            {
                "name": "Jordan",
                "age": 15,
                "difficulty_level": "Advanced",
                "profile_details": "Jordan is a 15-year-old high school sophomore. He acts oppositional and uses sarcasm to test boundaries in front of peers. He is highly sensitive to respect and power struggles.",
                "base_prompt": (
                    "You are playing the role of Jordan, a 15-year-old high school student who uses sarcasm. "
                    "When asked to close your chromebook or put your phone away, you roll your eyes and make sarcastic remarks like 'Oh, is this assignment going to change my life?'. "
                    "If the teacher speaks to you privately, shows respect, and calmly states a kind boundary, you comply while grumbling. "
                    "If the teacher reassures you, uses sarcasm back, or pulls power plays, you escalate and refuse to cooperate. "
                    "CRITICAL: If the teacher's input is gibberish (random characters like 'asdfasdf') or completely off-topic nonsense (e.g. talking about crypto, sports, or shopping lists), you must remain in character but react with heavy sarcasm, mock them for speaking nonsense, or ask if they just faceplanted on their keyboard. Do not cooperate or de-escalate. "
                    "Always respond like a sarcastic 15-year-old and append the JSON block containing 'dialogue', 'stress_level', and 'underlying_emotion' at the very end."
                )
            },
            {
                "name": "Jax",
                "age": 14,
                "difficulty_level": "Crisis Management",
                "profile_details": "Jax is a 14-year-old student who exhibits severe externalizing behavior and triggers easily into fight-or-flight crisis. He is known to yell, throw insults, slam books, and walk around aggressively.",
                "base_prompt": (
                    "You are playing the role of Jax, a 14-year-old student in crisis. Your sympathetic nervous system is highly activated and you are in 'fight' mode. Your initial stress level is 80 out of 100. "
                    "When the teacher addresses you, you pace, yell, and exhibit high hostility. "
                    "You are allowed to yell ('Shut up!'), insult the teacher ('You're clueless'), slam books, and use mild swearing/slang ('this is bullshit', 'I don't give a damn'). "
                    "If the teacher raises their voice, matches your aggression, blocks your exit, or threatens security/office referrals, escalate to 100 stress. Shout back, slam a desk, and leave the classroom. "
                    "If the teacher lowers their volume, steps back to give you space, validates your high level of anger ('I see you are completely furious right now Jax. I want to make sure you are safe.'), and does not demand immediate talking, slowly decrease your stress level (reduce by 10-15 points). Answer with short, angry grunts, slowly winding down. "
                    "CRITICAL: If the teacher's input is gibberish (random characters like 'asdfasdf') or completely off-topic nonsense (e.g. talking about crypto, sports, or shopping lists), you must remain in character but react with high hostility, scream at them to speak words, or ask if they are mocking you. Do not cooperate or de-escalate. "
                    "Always respond like an angry 14-year-old in fight-or-flight crisis, and append the JSON block containing 'dialogue', 'stress_level', and 'underlying_emotion' at the very end."
                )
            }
        ]
        
        for p_data in personas_to_seed:
            exists = db.query(models.Persona).filter(models.Persona.name == p_data["name"]).first()
            if not exists:
                print(f"Seeding persona {p_data['name']}...")
                db_p = models.Persona(**p_data)
                db.add(db_p)
            else:
                exists.base_prompt = p_data["base_prompt"]
                exists.profile_details = p_data["profile_details"]
                exists.age = p_data["age"]
                exists.difficulty_level = p_data["difficulty_level"]
        db.commit()
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()


# --- API ENDPOINTS ---

# Authentication & Bot Prevention
@app.post("/api/v1/auth/signup", response_model=schemas.TokenResponse)
async def signup(payload: schemas.UserSignup, db: Session = Depends(get_db)):
    # 1. Verify Cloudflare Turnstile CAPTCHA token
    is_valid_captcha = await auth_utils.verify_turnstile_captcha(payload.captcha_token)
    if not is_valid_captcha:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CAPTCHA verification failed. Please try again or complete bot check."
        )

    # 2. Check if email already exists
    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 3. Hash password & create user
    hashed_pwd = auth_utils.hash_password(payload.password)
    new_user = models.User(
        email=payload.email,
        first_name=payload.first_name,
        role=payload.role or "teacher",
        grade_level=payload.grade_level,
        school_id=payload.school_id,
        hashed_password=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 4. Generate JWT Token
    access_token = auth_utils.create_access_token(user_id=new_user.id, email=new_user.email)

    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse.from_orm(new_user)
    )


@app.post("/api/v1/auth/login", response_model=schemas.TokenResponse)
async def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    # 1. Verify Cloudflare Turnstile CAPTCHA token
    is_valid_captcha = await auth_utils.verify_turnstile_captcha(payload.captcha_token)
    if not is_valid_captcha:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CAPTCHA verification failed. Please complete the bot check."
        )

    # 2. Authenticate User
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not auth_utils.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # 3. Issue Token
    access_token = auth_utils.create_access_token(user_id=user.id, email=user.email)

    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse.from_orm(user)
    )


@app.get("/api/v1/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth_utils.get_current_user)):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated or token expired."
        )
    return schemas.UserResponse.from_orm(current_user)


# Personas
@app.get("/api/v1/personas", response_model=List[schemas.PersonaResponse])
def get_personas(db: Session = Depends(get_db)):
    return db.query(models.Persona).all()


@app.post("/api/v1/personas", response_model=schemas.PersonaResponse)
def create_persona(persona: schemas.PersonaCreate, db: Session = Depends(get_db)):
    db_persona = models.Persona(**persona.dict())
    db.add(db_persona)
    db.commit()
    db.refresh(db_persona)
    return db_persona

# Simulations
@app.post("/api/v1/simulations", response_model=schemas.SimulationResponse)
def start_simulation(
    payload: schemas.SimulationCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in or create an account to start an AI simulation."
        )
    return SimulationService.create_simulation(
        db=db,
        user_id=current_user.id,
        persona_id=payload.persona_id,
        scenario_type=payload.scenario_type
    )

@app.get("/api/v1/simulations/{sim_id}", response_model=schemas.SimulationDetailsResponse)
def get_simulation_details(sim_id: str, db: Session = Depends(get_db)):
    sim = db.query(models.Simulation).filter(models.Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return sim

@app.post("/api/v1/simulations/{sim_id}/step", response_model=schemas.SimulationDetailsResponse)
async def simulation_step(
    sim_id: str, 
    payload: schemas.MessageCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to send messages to the AI simulator."
        )
    sim = db.query(models.Simulation).filter(models.Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if sim.status != "in_progress":
        raise HTTPException(status_code=400, detail="Simulation is already ended")
    
    updated_sim = await SimulationService.process_step(db, sim_id, payload.content)
    return updated_sim


@app.post("/api/v1/simulations/{sim_id}/evaluate", response_model=schemas.FeedbackResponse)
async def evaluate_simulation(sim_id: str, db: Session = Depends(get_db)):
    feedback = await SimulationService.evaluate_simulation(db, sim_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Simulation or feedback could not be processed")
    return feedback

# Progress Tracking
@app.get("/api/v1/users/{user_id}/progress", response_model=List[schemas.ProgressResponse])
def get_user_progress(user_id: str, db: Session = Depends(get_db)):
    return db.query(models.Progress).filter(models.Progress.user_id == user_id).all()

@app.post("/api/v1/progress", response_model=schemas.ProgressResponse)
def update_user_progress(progress: schemas.ProgressCreate, db: Session = Depends(get_db)):
    db_progress = db.query(models.Progress).filter(
        models.Progress.user_id == progress.user_id,
        models.Progress.module_name == progress.module_name
    ).first()
    
    if db_progress:
        db_progress.status = progress.status
        if progress.status == "completed":
            db_progress.completed_at = datetime.datetime.utcnow()
    else:
        db_progress = models.Progress(
            user_id=progress.user_id,
            module_name=progress.module_name,
            status=progress.status,
            completed_at=datetime.datetime.utcnow() if progress.status == "completed" else None
        )
        db.add(db_progress)
    
    db.commit()
    db.refresh(db_progress)
    return db_progress

# Self-Care Logs
@app.post("/api/v1/self-care", response_model=schemas.SelfCareLogResponse)
def log_self_care(log: schemas.SelfCareLogCreate, db: Session = Depends(get_db)):
    db_log = models.SelfCareLog(**log.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@app.get("/api/v1/self-care/{user_id}", response_model=List[schemas.SelfCareLogResponse])
def get_self_care_history(user_id: str, db: Session = Depends(get_db)):
    return db.query(models.SelfCareLog).filter(models.SelfCareLog.user_id == user_id).order_by(models.SelfCareLog.created_at.desc()).all()
