# Directives

Per [CLAUDE.md](../CLAUDE.md), directives are the **what to do** layer. They define each feature's goals, inputs, outputs, edge cases, safety constraints, and verification expectations.

Directives are living documents — when behavior changes, update the directive **first**, then code and tests.

Source spec: [`../AI_Workforce_Operating_System_Build_Guide_v1.md`](../AI_Workforce_Operating_System_Build_Guide_v1.md).

## Cross-cutting

- [data_model.md](data_model.md)
- [security.md](security.md)
- [observability.md](observability.md)
- [ui_design.md](ui_design.md)
- [governance.md](governance.md)

## 16 Functional Features (Build Guide §4)

1. [role_management.md](role_management.md)
2. [ai_recommendations.md](ai_recommendations.md)
3. [notifications.md](notifications.md)
4. [api_access.md](api_access.md)
5. [webhooks.md](webhooks.md)
6. [usage_analytics.md](usage_analytics.md)
7. [microservices.md](microservices.md)
8. [rbac.md](rbac.md)
9. [encryption.md](encryption.md)
10. [audit_logging.md](audit_logging.md)
11. [recommender_system.md](recommender_system.md)
12. [time_series_forecasting.md](time_series_forecasting.md)
13. [data_pipeline.md](data_pipeline.md)
14. [performance_monitoring.md](performance_monitoring.md)
15. [ai_model_monitoring.md](ai_model_monitoring.md)
16. [alerting_system.md](alerting_system.md)

## Extra

- [value_proposition.md](value_proposition.md) — content service
- [auth.md](auth.md) — authentication (login/register/refresh)
