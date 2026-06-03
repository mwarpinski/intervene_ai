import datetime
import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    first_name = Column(String(100))
    role = Column(String(50), default="teacher")
    grade_level = Column(String(50))
    school_id = Column(String(100))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    simulations = relationship("Simulation", back_populates="user")
    progress = relationship("Progress", back_populates="user")
    self_care_logs = relationship("SelfCareLog", back_populates="user")


class Persona(Base):
    __tablename__ = "personas"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    age = Column(Integer)
    profile_details = Column(Text)
    base_prompt = Column(Text, nullable=False)
    difficulty_level = Column(String(50))  # Beginner, Intermediate, Advanced

    simulations = relationship("Simulation", back_populates="persona")


class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    persona_id = Column(String(36), ForeignKey("personas.id"))
    scenario_type = Column(String(100))
    status = Column(
        String(50), default="in_progress"
    )  # in_progress, completed, abandoned
    escalation_score = Column(Integer, default=50)  # 0 to 100
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    user = relationship("User", back_populates="simulations")
    persona = relationship("Persona", back_populates="simulations")
    messages = relationship(
        "Message", back_populates="simulation", cascade="all, delete-orphan"
    )
    feedback = relationship(
        "Feedback",
        back_populates="simulation",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    simulation_id = Column(String(36), ForeignKey("simulations.id"))
    sender = Column(String(50), nullable=False)  # "student" or "educator"
    content = Column(Text, nullable=False)
    escalation_change = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    simulation = relationship("Simulation", back_populates="messages")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    simulation_id = Column(String(36), ForeignKey("simulations.id"), unique=True)
    empathy_score = Column(Integer)
    boundary_score = Column(Integer)
    traps_identified = Column(JSON)  # JSON array of strings
    traps_justification = Column(JSON)  # JSON dict of trap explanations
    expert_comparison = Column(Text)
    constructive_advice = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    simulation = relationship("Simulation", back_populates="feedback")


class Progress(Base):
    __tablename__ = "progress"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    module_name = Column(String(100), nullable=False)
    status = Column(
        String(50), default="not_started"
    )  # not_started, in_progress, completed
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="progress")


class SelfCareLog(Base):
    __tablename__ = "self_care_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    mood_score = Column(Integer)
    activity_type = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="self_care_logs")
