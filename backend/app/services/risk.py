def classify_risk(score: int) -> str:
    if score <= 5:
        return "low"
    if score <= 8:
        return "moderate"
    if score <= 10:
        return "high"
    return "critical"


def calculate_risk(hazard: int, exposure: int, vulnerability: int) -> tuple[int, str]:
    score = hazard + exposure + vulnerability
    return score, classify_risk(score)
