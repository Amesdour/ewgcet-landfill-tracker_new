# Checklist de Conformité — Loi 18-07 + Loi 25-11
**EPWGCET** — Version 1.0 — Juillet 2025

Légende : ✅ Implémenté | ⚠️ Partiel / À valider | ❌ Non implémenté | 📋 Documentation seule

---

## LOI 18-07 — Protection des données personnelles

### Chapitre 1 — Principes fondamentaux
| Exigence | Statut | Notes |
|----------|--------|-------|
| Base légale documentée pour chaque traitement | ✅ | Voir REGISTRE-TRAITEMENTS.md |
| Finalité explicite et limitée | ✅ | Tags de finalité dans le registre |
| Minimisation des données | ✅ | Seuls les champs nécessaires collectés |
| Exactitude des données | ✅ | Interface de rectification disponible |
| Limitation de conservation | ✅ | Durées définies + endpoint de purge |
| Sécurité par conception | ✅ | Chiffrement, RBAC, headers sécurité |

### Chapitre 2 — Droits des personnes
| Droit | Statut | Endpoint |
|-------|--------|----------|
| Droit d'accès (Art.20) | ✅ | `GET /api/compliance/my-data/:userId` |
| Droit de rectification (Art.21) | ✅ | Interface profil + demande formelle |
| Droit d'opposition (Art.22) | ✅ | `POST /api/compliance/data-request` (type: objection) |
| Droit à l'effacement (Art.23) | ✅ | `POST /api/compliance/data-request` (type: erasure) |
| Droit à la portabilité | ✅ | `GET /api/compliance/my-data/:userId` (JSON) |
| Délai de réponse ≤ 30 jours | ✅ | Workflow data_requests |

### Chapitre 3 — Obligations du responsable
| Obligation | Statut | Notes |
|------------|--------|-------|
| Déclaration ANPDP | ❌ | Action requise avant mise en prod |
| Désignation DPD | ❌ | À nommer par le directeur EPWGCET |
| Notice d'information (consentement) | ✅ | Modal bilingue à la première connexion |
| Autorisation transfert transfrontalier (Art.22) | ⚠️ | Hébergement Replit/USA — autorisation ANPDP requise |
| Registre des traitements | ✅ | REGISTRE-TRAITEMENTS.md |
| Politique de confidentialité bilingue FR/AR | ✅ | POLITIQUE-CONFIDENTIALITE.md |

---

## LOI 25-11 — Cybersécurité

### Accès et authentification
| Exigence | Statut | Notes |
|----------|--------|-------|
| Politique de mot de passe (Art.10) | ✅ | Min 8 car., lettres+chiffres |
| Limitation des tentatives | ✅ | 10/min par IP, en mémoire |
| Contrôle d'accès basé sur les rôles | ✅ | Admin/Opérateur avec restrictions site |
| MFA pour comptes admin | ❌ | Recommandé — à implémenter |
| Gestion des sessions | ⚠️ | localStorage côté client uniquement |

### Journalisation et audit
| Exigence | Statut | Notes |
|----------|--------|-------|
| Journal d'audit des événements (Art.16) | ✅ | Table audit_logs, 5+ types |
| Horodatage précis des événements | ✅ | TIMESTAMPTZ |
| Conservation journal ≥ 5 ans | ✅ | Défini en politique |
| Rapport d'incident < 72h (Art.18) | ✅ | `GET /api/compliance/breach-report` |

### Sécurité technique
| Exigence | Statut | Notes |
|----------|--------|-------|
| Chiffrement en transit (TLS) | ✅ | HTTPS via Replit |
| Chiffrement des mots de passe | ✅ | bcrypt coût 10 |
| En-têtes de sécurité HTTP | ✅ | 6 headers implémentés |
| HSTS (production) | ✅ | max-age=31536000 |
| Audit des dépendances | ⚠️ | npm audit — 0 vulnérabilité haute/critique connue |
| Tests de pénétration | ❌ | À planifier annuellement |

### Infrastructure
| Exigence | Statut | Notes |
|----------|--------|-------|
| Hébergement territoire algérien | ❌ | Replit/USA — voir Art.22 Loi 18-07 |
| Plan de continuité (PCA) | ❌ | À établir |
| Plan de reprise d'activité (PRA) | ❌ | À établir |
| Sauvegardes régulières | ⚠️ | Replit gère les sauvegardes DB |

---

## Priorités d'action

### 🔴 Critique (avant mise en production)
1. Soumettre déclaration de traitements à l'ANPDP
2. Obtenir autorisation ANPDP pour transfert transfrontalier (ou migrer l'hébergement)
3. Désigner un Délégué à la Protection des Données (DPD)

### 🟠 Élevé (dans les 3 mois)
4. Implémenter MFA pour les comptes administrateur
5. Renforcer la gestion de sessions côté serveur (tokens JWT ou sessions serveur)
6. Planifier le premier test de pénétration

### 🟡 Modéré (dans les 6 mois)
7. Établir un Plan de Continuité d'Activité (PCA)
8. Mettre en place un Plan de Reprise d'Activité (PRA)
9. Former les agents aux procédures de protection des données

---

*Dernière mise à jour : Juillet 2025 | Prochaine révision : Juillet 2026*
*⚠️ Ce document doit être validé par un juriste spécialisé en droit numérique algérien*
