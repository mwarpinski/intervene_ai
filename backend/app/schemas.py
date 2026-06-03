from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
import datetime


# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    role: Optional[str] = "teacher"
    grade_level: Optional[str] = None
    school_id: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    id: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Persona Schemas ---
class PersonaBase(BaseModel):
    name: str
    age: Optional[int] = None
    profile_details: Optional[str] = None
    base_prompt: str
    difficulty_level: Optional[str] = "Beginner"


class PersonaCreate(PersonaBase):
    pass


class PersonaResponse(PersonaBase):
    id: str

    class Config:
        from_attributes = True


# --- Message Schemas ---
class MessageBase(BaseModel):
    sender: str  # "student" or "educator"
    content: str


class MessageCreate(MessageBase):
    pass


class MessageResponse(MessageBase):
    id: str
    simulation_id: str
    escalation_change: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Feedback Schemas ---
class FeedbackResponse(BaseModel):
    id: str
    simulation_id: str
    empathy_score: int
    boundary_score: int
    traps_identified: List[str]
    traps_justification: Dict[str, str]
    expert_comparison: str
    constructive_advice: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Simulation Schemas ---
class SimulationBase(BaseModel):
    persona_id: str
    scenario_type: str


class SimulationCreate(SimulationBase):
    user_id: str


class SimulationResponse(SimulationBase):
    id: str
    user_id: str
    status: str
    escalation_score: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class SimulationDetailsResponse(SimulationResponse):
    messages: List[MessageResponse] = []
    feedback: Optional[FeedbackResponse] = None
    persona: Optional[PersonaResponse] = None

    class Config:
        from_attributes = True


# --- Progress Schemas ---
class ProgressBase(BaseModel):
    module_name: str
    status: str


class ProgressCreate(ProgressBase):
    user_id: str


class ProgressResponse(ProgressBase):
    id: str
    user_id: str
    completed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


# --- Self Care Schemas ---
class SelfCareLogBase(BaseModel):
    mood_score: int
    activity_type: str
    notes: Optional[str] = None


class SelfCareLogCreate(SelfCareLogBase):
    user_id: str


class SelfCareLogResponse(SelfCareLogBase):
    id: str
    user_id: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True
