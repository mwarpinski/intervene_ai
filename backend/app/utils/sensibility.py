import re

# Common pronouns, auxiliary verbs, and classroom-related keywords.
# If a custom input contains absolutely none of these, it's likely out of context.
CLASSROOM_KEYWORDS = {
    "math", "desk", "sit", "seat", "class", "transition", "work", "dinosaur", 
    "toy", "paper", "chromebook", "computer", "phone", "recess", "rule", "help", 
    "learn", "room", "talk", "understand", "feel", "scared", "angry", "furious", 
    "upset", "school", "teacher", "student", "clean", "quiet", "stop", "sorry", 
    "space", "break", "okay", "no", "yes", "please", "we", "you", "me", "i", 
    "can", "do", "time", "need", "go", "what", "how", "why", "are", "is", "am",
    "was", "were", "be", "with", "for", "to", "at", "on", "in", "it", "this", "that"
}

def analyze_input_sensibility(text: str) -> str:
    """
    Analyzes input text to determine if it is:
    - 'GIBBERISH': Keyboard smashes (e.g. 'asdfjkl;', 'qwrtypsdfghj')
    - 'IRRELEVANT': Syntactically correct but completely off-topic/nonsense
    - 'VALID': Reasonable classroom conversational attempt
    """
    cleaned = text.strip().lower()
    if not cleaned:
        return "GIBBERISH"

    # 1. Check for character repetition (e.g., 'aaaaaa', 'sssss')
    if re.search(r'(.)\1{4,}', cleaned):
        return "GIBBERISH"

    # 2. Check for keyboard rows / common smash patterns
    smash_patterns = ["asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl", "jkl;", "qwer", "wert", "erty", "rtyu", "tyui", "yuio", "uiop", "zxcv", "xcvb", "cvbn", "vbnm"]
    for pattern in smash_patterns:
        if pattern in cleaned:
            return "GIBBERISH"

    # 3. Vowel ratio test in words (excluding very short words/abbreviations)
    words = re.findall(r'\b[a-z]+\b', cleaned)
    if words:
        total_long_words = 0
        gibberish_words = 0
        for w in words:
            if len(w) >= 5:
                total_long_words += 1
                vowels_count = sum(1 for char in w if char in "aeiouy")
                # English words almost always have a reasonable vowel ratio
                if vowels_count / len(w) < 0.15:
                    gibberish_words += 1
        
        if total_long_words > 0 and (gibberish_words / total_long_words) > 0.5:
            return "GIBBERISH"

    # 4. Check for extreme length with no spaces
    if len(cleaned) > 15 and " " not in cleaned:
        return "GIBBERISH"

    # 5. Check for off-topic/irrelevant context
    # If there are at least 3 words, and none match our classroom/conversational keywords, flag as irrelevant
    if len(words) >= 3:
        word_set = set(words)
        matches = word_set.intersection(CLASSROOM_KEYWORDS)
        if len(matches) == 0:
            return "IRRELEVANT"

    return "VALID"
