# Minimum data dictionary

## User

Represents a platform actor. Sprint 0 seed users are synthetic and do not represent children.

## Role

Defines the initial access boundary: admin, monitor, validator.

## Project

Groups territories, observations and MRV records.

## Territory

Represents a configurable geographic area. Sprint 0 uses a synthetic San Cristobal demo territory.

## Observation

Stores a risk observation with category, description, hazard, exposure, vulnerability, coordinates, status and synthetic flag.

## Evidence

Links evidence to an observation. Sprint 0 uses URL placeholders, not real sensitive files.

## Validation

Stores the review status and validator comment for an observation.

## ClimateData

Stores public or synthetic climate/environmental records with source and timestamp.

## RiskScore

Stores transparent risk score output using the Sprint 0 formula.

Formula:

```text
risk_score = hazard + exposure + vulnerability
```

Levels:

- 3-5 low
- 6-8 moderate
- 9-10 high
- 11-12 critical
