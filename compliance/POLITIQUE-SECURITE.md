# Politique de Sécurité des Systèmes d'Information
**EPWGCET — Loi 25-11 du 22 juin 2023 relative à la cybersécurité**
Version 1.0 — Juillet 2025

---

## 1. Champ d'application
Cette politique s'applique à l'ensemble du système de gestion des CET EPWGCET, incluant l'application web, la base de données PostgreSQL, l'infrastructure d'hébergement et tous les utilisateurs (administrateurs et opérateurs).

## 2. Objectifs de sécurité (Loi 25-11, Art. 8)
- **Confidentialité** : seuls les utilisateurs autorisés accèdent aux données
- **Intégrité** : les données ne sont pas modifiées de manière non autorisée
- **Disponibilité** : le système est accessible aux utilisateurs légitimes
- **Traçabilité** : toutes les actions sensibles sont enregistrées

## 3. Contrôle d'accès (Loi 25-11, Art. 10)

### 3.1 Authentification
- Mot de passe minimum **8 caractères**, lettres + chiffres obligatoires
- Limitation de débit : **10 tentatives par minute par adresse IP**
- Mots de passe stockés avec **bcrypt (coût 10)**
- ⚠️ **Action requise** : Implémenter l'authentification multi-facteurs (MFA) pour les comptes administrateur

### 3.2 Autorisations (RBAC)
| Rôle | Droits |
|------|--------|
| Administrateur | Accès complet : gestion utilisateurs, clients, paramètres, conformité |
| Opérateur | Saisie dépôt + consultation historique de son site uniquement |

### 3.3 Principe du moindre privilège
- Les opérateurs sont restreints à leur site assigné
- Les données hors périmètre ne sont pas visibles
- Les routes API admin ne sont pas protégées par middleware JWT côté serveur ⚠️ **Action recommandée** : Ajouter des gardes API serveur basées sur session/token

## 4. En-têtes de sécurité HTTP (implémentés)
```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000 (production uniquement)
```

## 5. Journal d'audit (Loi 25-11, Art. 16)
Table `audit_logs` — Événements enregistrés :
- `LOGIN_SUCCESS` / `LOGIN_FAIL` — Toutes les tentatives d'authentification
- `PASSWORD_CHANGE` / `PASSWORD_CHANGE_FAIL` — Modifications de mot de passe
- `CONSENT_GIVEN` — Acceptation de la politique de confidentialité
- `DATA_ACCESS_REQUEST` — Exercice du droit d'accès (Art.20 Loi 18-07)
- `DATA_REQUEST_*` — Demandes de droits (effacement, portabilité…)
- `RETENTION_PURGE` — Purge automatique des données expirées
Conservation : **5 ans minimum**

## 6. Gestion des incidents (Loi 25-11, Art. 18 — Notification 72h)

### 6.1 Niveaux de gravité
| Niveau | Exemples | Action |
|--------|----------|--------|
| Critique | Exfiltration de données, compromission admin | Notification ANSSI < 72h, suspension système |
| Élevé | Nombreuses tentatives d'intrusion, modification non autorisée | Alerte immédiate DSI, enquête interne |
| Modéré | Tentatives de connexion échouées répétées | Revue du journal d'audit |
| Faible | Erreurs opérationnelles normales | Log uniquement |

### 6.2 Procédure de notification (Art. 18 Loi 25-11)
1. **T+0h** : Détection → Isolation et préservation des preuves
2. **T+4h** : Évaluation initiale et classification
3. **T+24h** : Notification interne (direction)
4. **T+72h** : Notification obligatoire à l'**ANSSI** (Agence Nationale de la Sécurité des Systèmes d'Information)
5. **T+30j** : Rapport complet post-incident

Générer un rapport via : `GET /api/compliance/breach-report?since=<ISO_DATE>`

## 7. Gestion des vulnérabilités
- Dépendances auditées via `npm audit`
- Packages bloqués par politique de sécurité Replit (`shell-quote` CVE — bloqué lors du déploiement)
- ⚠️ **Action recommandée** : Planifier des tests de pénétration annuels conformément à la Loi 25-11

## 8. Infrastructure et hébergement
- **Environnement actuel** : Replit Cloud (USA) — Infrastructure non algérienne
- ⚠️ **Action requise** : Évaluer la conformité avec l'article 22 de la Loi 18-07 concernant les transferts transfrontaliers. Envisager une migration vers un hébergeur algérien certifié ou cloud souverain européen (RGPD compatible — Art.22 Loi 18-07 reconnaît les pays à protection adéquate).

## 9. Déclaration à l'ANPDP (Loi 18-07, Art. 12-16)
⚠️ **Action requise** : Déposer une déclaration de traitement auprès de l'**ANPDP** avant mise en production officielle.
Traitements concernés :
- Gestion des agents (données employés) → Déclaration ordinaire
- Traitement des données clients entreprises → Déclaration ordinaire
- Journal d'audit (données comportementales) → Déclaration ordinaire

## 10. Responsabilités
| Rôle | Responsabilité |
|------|----------------|
| Directeur EPWGCET | Responsable de traitement (Art.4 Loi 18-07) |
| DPD (à désigner) ⚠️ | Supervision conformité, contact ANPDP |
| Administrateur système | Application technique des politiques |
| Chaque agent | Respect des procédures, signalement incident |

---

*⚠️ Éléments nécessitant une validation juridique : §3.3 (gardes API), §6 (protocole ANSSI), §8 (hébergement), §9 (déclaration ANPDP)*
*Document à réviser annuellement ou après tout incident majeur.*
