import json
import logging
import httpx
from app.config import settings

logger = logging.getLogger("app.services.ai")


class AIService:
    @staticmethod
    async def generate_student_response(
        persona_name: str, persona_prompt: str, history: list, current_stress: int
    ) -> dict:
        """
        Sends the dialogue history to Claude/OpenAI/Gemini and returns the student's next response,
        updated stress level, and underlying emotion.
        """
        # Determine if we have valid API keys
        use_gemini = bool(
            settings.GEMINI_API_KEY and "your-gemini-key" not in settings.GEMINI_API_KEY
        )
        use_anthropic = bool(
            settings.ANTHROPIC_API_KEY
            and "your-anthropic-key" not in settings.ANTHROPIC_API_KEY
        )
        use_openai = bool(
            settings.OPENAI_API_KEY and "your-openai-key" not in settings.OPENAI_API_KEY
        )

        if not (use_gemini or use_anthropic or use_openai):
            return AIService._mock_student_response(
                persona_name, history, current_stress
            )

        system_prompt = f"{persona_prompt}\nYour current stress level is {current_stress}/100. Make sure to append the JSON format exactly."

        try:
            if use_gemini:
                gemini_messages = []
                for msg in history:
                    role = "user" if msg["sender"] == "educator" else "model"
                    gemini_messages.append(
                        {"role": role, "parts": [{"text": msg["content"]}]}
                    )

                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}",
                        headers={"Content-Type": "application/json"},
                        json={
                            "systemInstruction": {"parts": [{"text": system_prompt}]},
                            "contents": gemini_messages,
                            "generationConfig": {
                                "responseMimeType": "application/json"
                            },
                        },
                    )
                    response.raise_for_status()
                    result = response.json()
                    raw_text = result["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(raw_text)

            elif use_anthropic:
                # Format messages for APIs
                api_messages = []
                for msg in history:
                    role = "user" if msg["sender"] == "educator" else "assistant"
                    api_messages.append({"role": role, "content": msg["content"]})

                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": settings.ANTHROPIC_API_KEY,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json",
                        },
                        json={
                            "model": "claude-3-5-sonnet-20241022",
                            "max_tokens": 1024,
                            "system": system_prompt,
                            "messages": api_messages,
                        },
                    )
                    response.raise_for_status()
                    result = response.json()
                    raw_text = result["content"][0]["text"]
                    return AIService._parse_json_response(raw_text, current_stress)
            else:
                # Use OpenAI
                api_messages = []
                for msg in history:
                    role = "user" if msg["sender"] == "educator" else "assistant"
                    api_messages.append({"role": role, "content": msg["content"]})
                openai_messages = [
                    {"role": "system", "content": system_prompt}
                ] + api_messages
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": "gpt-4o",
                            "messages": openai_messages,
                            "response_format": {"type": "json_object"},
                        },
                    )
                    response.raise_for_status()
                    result = response.json()
                    raw_text = result["choices"][0]["message"]["content"]
                    return json.loads(raw_text)

        except Exception as e:
            logger.error(f"Error calling LLM API: {e}. Falling back to mock response.")
            return AIService._mock_student_response(
                persona_name, history, current_stress
            )

    @staticmethod
    async def generate_coaching_feedback(dialogue_history: list) -> dict:
        """
        Evaluates the educator's responses, scoring them on Empathy and Kind Limits,
        identifies any traps used, and provides coaching recommendations.
        """
        use_gemini = bool(
            settings.GEMINI_API_KEY and "your-gemini-key" not in settings.GEMINI_API_KEY
        )
        use_anthropic = bool(
            settings.ANTHROPIC_API_KEY
            and "your-anthropic-key" not in settings.ANTHROPIC_API_KEY
        )
        use_openai = bool(
            settings.OPENAI_API_KEY and "your-openai-key" not in settings.OPENAI_API_KEY
        )

        if not (use_gemini or use_anthropic or use_openai):
            return AIService._mock_coaching_feedback(dialogue_history)

        formatted_history = "\n".join(
            [f"{m['sender'].capitalize()}: {m['content']}" for m in dialogue_history]
        )

        system_prompt = (
            "You are an expert school psychologist and instructor in Behavior Skills Training (BST).\n"
            "Analyze the dialogue log and evaluate the educator on Empathy & Validation, Kind Limit Setting, and Response Trap Avoidance.\n"
            "Respond ONLY with a JSON object in this format:\n"
            "{\n"
            '  "empathy_score": [0-100],\n'
            '  "boundary_score": [0-100],\n'
            '  "traps_identified": ["coercion", "sarcasm", etc.],\n'
            '  "traps_justification": {"coercion": "explanation", ...},\n'
            '  "expert_comparison": "narrative",\n'
            '  "constructive_advice": "tips"\n'
            "}"
        )

        try:
            if use_gemini:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}",
                        headers={"Content-Type": "application/json"},
                        json={
                            "systemInstruction": {"parts": [{"text": system_prompt}]},
                            "contents": [
                                {
                                    "role": "user",
                                    "parts": [
                                        {
                                            "text": f"Analyze this dialogue:\n{formatted_history}"
                                        }
                                    ],
                                }
                            ],
                            "generationConfig": {
                                "responseMimeType": "application/json"
                            },
                        },
                    )
                    response.raise_for_status()
                    result = response.json()
                    raw_text = result["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(raw_text)

            elif use_anthropic:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": settings.ANTHROPIC_API_KEY,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json",
                        },
                        json={
                            "model": "claude-3-5-sonnet-20241022",
                            "max_tokens": 1500,
                            "system": system_prompt,
                            "messages": [
                                {
                                    "role": "user",
                                    "content": f"Analyze this dialogue:\n{formatted_history}",
                                }
                            ],
                        },
                    )
                    response.raise_for_status()
                    result = response.json()
                    raw_text = result["content"][0]["text"]
                    return json.loads(raw_text)
            else:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": "gpt-4o",
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {
                                    "role": "user",
                                    "content": f"Analyze this dialogue:\n{formatted_history}",
                                },
                            ],
                            "response_format": {"type": "json_object"},
                        },
                    )
                    response.raise_for_status()
                    result = response.json()
                    raw_text = result["choices"][0]["message"]["content"]
                    return json.loads(raw_text)

        except Exception as e:
            logger.error(
                f"Error calling LLM Evaluator: {e}. Falling back to mock feedback."
            )
            return AIService._mock_coaching_feedback(dialogue_history)

    @staticmethod
    def _parse_json_response(text: str, default_stress: int) -> dict:
        """Parses the expected JSON block out of the LLM text response."""
        try:
            # Look for JSON markers if Claude outputs surrounding conversational text
            if "{" in text:
                start = text.find("{")
                end = text.rfind("}") + 1
                return json.loads(text[start:end])
            return {
                "dialogue": text,
                "stress_level": default_stress,
                "underlying_emotion": "unknown",
            }
        except Exception:
            return {
                "dialogue": text,
                "stress_level": default_stress,
                "underlying_emotion": "unknown",
            }

    @staticmethod
    def _mock_student_response(
        persona_name: str, history: list, current_stress: int
    ) -> dict:
        """Offline mock response logic simulating a student's emotional response loop."""
        from app.utils.sensibility import analyze_input_sensibility

        last_teacher_message = ""
        for msg in reversed(history):
            if msg["sender"] == "educator":
                last_teacher_message = msg["content"]
                break

        # Check sensibility of educator's response
        sensibility = analyze_input_sensibility(last_teacher_message)
        last_teacher_message_lower = last_teacher_message.lower()

        # Analyze keywords in the educator's response to simulate behavioral state
        is_empathetic = any(
            w in last_teacher_message_lower
            for w in [
                "understand",
                "hear you",
                "sorry",
                "feel",
                "tough",
                "hard",
                "difficult",
                "safe",
            ]
        )
        is_coercive = any(
            w in last_teacher_message_lower
            for w in [
                "must",
                "have to",
                "now",
                "consequence",
                "office",
                "principal",
                "recess",
                "or else",
                "warn",
                "yelling",
            ]
        )
        is_sarcastic = any(
            w in last_teacher_message_lower
            for w in ["really", "great job", "smart", "seriously", "whatever"]
        )
        is_clear_limit = any(
            w in last_teacher_message_lower
            for w in [
                "time to",
                "we need to",
                "put the",
                "let's walk",
                "the rule is",
            ]
        )

        # Default values
        new_stress = current_stress
        dialogue = "..."
        emotion = "neutral"

        # 1. Handle Gibberish
        if sensibility == "GIBBERISH":
            if persona_name.lower() == "leo":
                new_stress = min(current_stress + 5, 100)
                dialogue = "*looks confused, tilting head* What did you say? That sounds like dinosaur gibberish! ROAR!"
                emotion = "confused"
            elif persona_name.lower() == "maya":
                new_stress = min(current_stress + 10, 100)
                dialogue = "*shrinks back slightly, looking nervous* Are you talking in a secret language? I don't understand..."
                emotion = "highly anxious"
            elif persona_name.lower() == "jordan":
                new_stress = min(current_stress + 15, 100)
                dialogue = "*stares blankly at you, then rolls eyes* Did you just faceplant on your keyboard? Try speaking English."
                emotion = "mocking contempt"
            else:  # jax
                new_stress = min(current_stress + 20, 100)
                dialogue = "*yells, slamming desk* Speak words! Are you mocking me? Stop talking nonsense!"
                emotion = "escalated rage"
            return {
                "dialogue": dialogue,
                "stress_level": new_stress,
                "underlying_emotion": emotion,
            }

        # 2. Handle Irrelevant
        if sensibility == "IRRELEVANT":
            if persona_name.lower() == "leo":
                new_stress = min(current_stress + 5, 100)
                dialogue = "*bounces up and down* I don't care about that! I want to play with my T-Rex!"
                emotion = "distracted avoidance"
            elif persona_name.lower() == "maya":
                new_stress = min(current_stress + 5, 100)
                dialogue = "*pulls hood tighter* Why are you talking about that? That has nothing to do with this worksheet."
                emotion = "avoidant confusion"
            elif persona_name.lower() == "jordan":
                new_stress = min(current_stress + 10, 100)
                dialogue = "*scoffs, raising an eyebrow* What does that have to do with anything? Are you trying to distract me?"
                emotion = "skeptical defense"
            else:  # jax
                new_stress = min(current_stress + 15, 100)
                dialogue = (
                    "*screams* I don't give a damn about that! Leave me the hell alone!"
                )
                emotion = "intense fight response"
            return {
                "dialogue": dialogue,
                "stress_level": new_stress,
                "underlying_emotion": emotion,
            }

        # 3. Handle Normal Conversational Input
        if persona_name.lower() == "leo":
            if is_empathetic and is_clear_limit:
                new_stress = max(current_stress - 15, 10)
                dialogue = "Okay... I just really don't want to do the math page. It has too many numbers. But I can put my toys away."
                emotion = "relieved"
            elif is_empathetic:
                new_stress = max(current_stress - 10, 20)
                dialogue = "Yeah, it is hard! But can I keep playing with my dinosaurs?"
                emotion = "seeking connection"
            elif is_coercive or is_sarcastic:
                new_stress = min(current_stress + 20, 100)
                dialogue = "NO! You can't make me! *screams and kicks table leg*"
                emotion = "fight response (anger)"
            else:
                new_stress = current_stress
                dialogue = "I don't care! Dinosaurs are better than worksheets!"
                emotion = "avoidance"
        elif persona_name.lower() == "maya":
            if is_empathetic and is_clear_limit:
                new_stress = max(current_stress - 15, 15)
                dialogue = "*sniffles, nods slowly* Okay. I will sit at the table. Can I keep my soft toy in my lap?"
                emotion = "settling"
            elif is_empathetic:
                new_stress = max(current_stress - 8, 30)
                dialogue = "*keeps head down, whispers* Everyone is looking at me. I hate this classroom."
                emotion = "shame / anxiety"
            elif is_coercive or is_sarcastic:
                new_stress = min(current_stress + 25, 100)
                dialogue = "*tucks knees tighter to chest, turns completely away, and refuses to speak*"
                emotion = "freeze response (shut down)"
            else:
                new_stress = current_stress
                dialogue = "*does not look up, doodles aggressively on the desk*"
                emotion = "avoidant freeze"
        elif persona_name.lower() == "jordan":
            if is_empathetic and is_clear_limit:
                new_stress = max(current_stress - 15, 20)
                dialogue = "Whatever. I don't see why it matters so much. Fine, I'll close the chromebook. But this assignment is still garbage."
                emotion = "compliant defiance"
            elif is_empathetic:
                new_stress = max(current_stress - 10, 30)
                dialogue = (
                    "Yeah, well, this class is boring anyway. None of it makes sense."
                )
                emotion = "frustrated defense"
            elif is_coercive or is_sarcastic:
                new_stress = min(current_stress + 20, 100)
                dialogue = (
                    "Oh, what are you gonna do, write me up? Go ahead. See if I care."
                )
                emotion = "oppositional fight"
            else:
                new_stress = current_stress
                dialogue = "This is stupid. I'm not doing this."
                emotion = "defensive check-out"
        else:  # jax
            if is_empathetic and is_clear_limit:
                new_stress = max(current_stress - 15, 30)
                dialogue = "*pacing slows slightly, glares at you* Fine, whatever. Just stay out of my space. I don't want to talk right now."
                emotion = "de-escalating rage"
            elif is_empathetic:
                new_stress = max(current_stress - 10, 45)
                dialogue = "*breathes heavily, arms crossed* You don't know what it's like. Everyone is always on my back."
                emotion = "defensive trust building"
            elif is_coercive or is_sarcastic:
                new_stress = min(current_stress + 25, 100)
                dialogue = (
                    "MAKE ME! *kicks a chair hard and slams the door as he storms out*"
                )
                emotion = "extreme fight response (crisis)"
            else:
                new_stress = min(current_stress + 5, 100)
                dialogue = (
                    "*yells* I don't give a damn about your rules! Leave me alone!"
                )
                emotion = "hostile fight"

        return {
            "dialogue": dialogue,
            "stress_level": new_stress,
            "underlying_emotion": emotion,
        }

    @staticmethod
    def _mock_coaching_feedback(dialogue_history: list) -> dict:
        """Offline mock evaluation analyzer."""
        from app.utils.sensibility import analyze_input_sensibility

        # Check for traps and empathy in dialogue
        traps = []
        justification = {}
        empathy_score = 50
        boundary_score = 50

        teacher_msgs = [
            m["content"] for m in dialogue_history if m["sender"] == "educator"
        ]

        for idx, text in enumerate(teacher_msgs):
            text_lower = text.lower()
            sensibility = analyze_input_sensibility(text)

            if sensibility == "GIBBERISH":
                if "gibberish" not in traps:
                    traps.append("gibberish")
                    justification["gibberish"] = (
                        "You sent keyboard smashes. Dysregulated students perceive nonsensical responses "
                        "as mocking or non-communicative, escalating their defense mechanisms."
                    )
            elif sensibility == "IRRELEVANT":
                if "irrelevant" not in traps:
                    traps.append("irrelevant")
                    justification["irrelevant"] = (
                        "You changed the topic to something irrelevant. Dysregulated students need clear presence "
                        "and safety; changing the subject breaks connection."
                    )

            if any(
                w in text_lower
                for w in [
                    "must",
                    "consequence",
                    "office",
                    "principal",
                    "recess",
                    "or else",
                    "warn",
                ]
            ):
                if "coercion" not in traps:
                    traps.append("coercion")
                    justification["coercion"] = (
                        f"In your response '{text}', you used a threat of exclusion or consequences rather "
                        "than co-regulating the student."
                    )
            if any(
                w in text_lower for w in ["really", "seriously", "smart", "whatever"]
            ):
                if "sarcasm" not in traps:
                    traps.append("sarcasm")
                    justification["sarcasm"] = (
                        f"Your phrasing '{text}' carried a sarcastic tone, which breaks trust."
                    )
            if any(
                w in text_lower
                for w in [
                    "understand",
                    "hear you",
                    "feel",
                    "tough",
                    "hard",
                    "difficult",
                ]
            ):
                empathy_score = min(empathy_score + 15, 100)
            if any(
                w in text_lower
                for w in [
                    "time to",
                    "we need to",
                    "put the",
                    "let's walk",
                    "the rule is",
                ]
            ):
                boundary_score = min(boundary_score + 15, 100)

        if not traps:
            empathy_score = max(empathy_score + 10, 80)
            boundary_score = max(boundary_score + 10, 80)
            expert_comparison = "Excellent work! You avoided response traps and kept your tone supportive yet clear."
            constructive_advice = "Continue validating student emotions before providing simple, direct directions."
        else:
            expert_comparison = "You set limits but fell into response traps, causing student escalation."
            constructive_advice = (
                "Avoid threats of consequences (coercion) when the student's nervous system is dysregulated. "
                "Calm first, redirect second."
            )

        return {
            "empathy_score": empathy_score,
            "boundary_score": boundary_score,
            "traps_identified": traps,
            "traps_justification": justification,
            "expert_comparison": expert_comparison,
            "constructive_advice": constructive_advice,
        }
