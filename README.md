# Infinity Atlas Climate & Health MRV

**Open-source climate-health MRV toolkit for municipalities and vulnerable communities.**

Infinity Atlas Climate & Health MRV is an open-source toolkit designed to help local governments, communities, schools and implementing partners collect, structure, visualize and report climate-related environmental risks affecting children’s health.

The toolkit focuses on strategic planning and local decision-making by connecting environmental exposure data with child-centered climate resilience. It supports risk mapping, vulnerability scoring, MRV indicators, community reporting and basic dashboard structures.

## Problem

Many vulnerable territories face climate-related environmental risks such as waste pollution, water contamination, heat exposure, air quality concerns, hazardous waste exposure and ecosystem degradation. These risks can directly or indirectly affect children’s health, but local actors often lack accessible, interoperable and decision-ready tools to monitor and respond to them.

## Solution

This toolkit provides a practical open-source foundation for climate-health MRV, including:

- climate-health risk taxonomy;
- data collection templates;
- MRV indicator framework;
- community and municipal reporting templates;
- dashboard wireframes;
- implementation guidance;
- roadmap for MVP development.

## Intended Users

- Municipal governments
- Community organizations
- Schools
- Health and environmental authorities
- NGOs and implementing partners
- Climate and public health practitioners

## Initial Use Case

The initial use case is connected to InfinityGaia’s work in Ecuador, including San Cristóbal, Galápagos, where circular waste management, environmental risk reduction, public health protection and marine pollution prevention are connected to climate resilience and community wellbeing.

## Open-Source Boundary

This repository represents the public-good open-source module of the broader Infinity Atlas vision.

Open-source components may include data templates, basic indicators, documentation, dashboard wireframes and community MRV tools.

InfinityGaia retains ownership of its brand, advanced architecture, commercial configurations, implementation services, know-how, client-specific deployments and MRV-as-a-Service model.

## License

Software components are intended to be released under the MIT License.

Documentation and content may be released under a Creative Commons Attribution license where applicable.

## Status

This project is currently in prototype design and pilot-readiness stage. The next phase is MVP software development, pilot testing, documentation and validation with local users.

## Sprint 0 Foundation

Sprint 0 adds an executable technical foundation for the Climate & Health MRV Toolkit:

- React/Vite frontend with English default and Spanish selectable;
- FastAPI backend/API;
- SQLAlchemy data model and Alembic migration;
- synthetic demo seed data marked with `is_synthetic=true`;
- local SQLite execution path;
- Docker Compose configuration for PostgreSQL/PostGIS, pending validation;
- documentation for architecture, backlog, risks, decisions, data model, dependencies and checkpoint publication.

The development seed endpoint `POST /api/v1/admin/seed` is available only in local/development/test environments. It is hidden and disabled outside those environments.

Sprint 0 technical documents:

- `docs/sprint-0-delivery.md`
- `docs/checkpoint-publication-report.md`
- `docs/dependencies-and-licenses.md`

## 12-Month Roadmap

1. Finalize climate-health risk taxonomy and indicator framework.
2. Develop data collection templates for municipal and community use.
3. Build a basic open-source dashboard prototype.
4. Test the toolkit with local users in Ecuador.
5. Improve documentation and data workflows.
6. Publish an updated open-source release.
7. Prepare replication guidance for other municipalities and vulnerable communities.

## Contact

InfinityGaia S.A.S. B.I.C.  
Website: https://www.infinitygaia.org  
Project Lead: Carlos Cifuentes  
Email: carlos.cifuentes@infinitygaia.org
