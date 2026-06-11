# Registre des Activités de Traitement
**EPWGCET — Loi 18-07, Art. 12 — Déclaration ANPDP**
Version 1.0 — Juillet 2025

⚠️ **Ce registre doit être soumis à l'ANPDP avant mise en production officielle.**

---

## Traitement 1 — Gestion des agents / utilisateurs du système

| Champ | Valeur |
|-------|--------|
| **Intitulé** | Gestion des comptes utilisateurs du système CET |
| **Responsable** | EPWGCET, Directeur |
| **Finalité** | Authentification, habilitation, traçabilité opérationnelle |
| **Base légale** | Contrat d'emploi + Obligation légale (Loi 25-11 Art.16) |
| **Données traitées** | Nom, email professionnel, téléphone professionnel, matricule, rôle, mot de passe haché |
| **Catégories concernées** | Agents EPWGCET |
| **Destinataires** | Administrateur système uniquement |
| **Transfert hors Algérie** | Oui (hébergement Replit/USA) — ⚠️ Autorisation ANPDP requise |
| **Durée conservation** | Durée emploi + 5 ans |
| **Mesures sécurité** | Bcrypt, RBAC, audit log, TLS |
| **Type déclaration** | Déclaration ordinaire |

---

## Traitement 2 — Gestion des clients (entreprises et communes)

| Champ | Valeur |
|-------|--------|
| **Intitulé** | Fichier clients contractuels |
| **Finalité** | Gestion des conventions, facturation, suivi des flux de déchets |
| **Base légale** | Contrat + Obligation légale (fiscale, environnementale) |
| **Données traitées** | Raison sociale, NIF, RC, adresse, téléphone, données financières |
| **Note** | Les clients sont principalement des personnes morales (entreprises, communes). Les données des personnes physiques (Hadj Mourad Rabah, Rachid Benbrahim) constituent des données personnelles au sens de la Loi 18-07. |
| **Durée conservation** | 10 ans (Code du Commerce) |
| **Type déclaration** | Déclaration ordinaire |

---

## Traitement 3 — Journal des déchargements / pesées

| Champ | Valeur |
|-------|--------|
| **Intitulé** | Registre opérationnel des flux de déchets |
| **Finalité** | Traçabilité réglementaire, facturation, reporting environnemental |
| **Base légale** | Obligation légale (Code de l'environnement, réglementation déchets) |
| **Données traitées** | Plaque véhicule, type déchet, tonnage, date/heure, opérateur, site |
| **Durée conservation** | 10 ans |
| **Type déclaration** | Déclaration ordinaire |

---

## Traitement 4 — Journal d'audit de sécurité

| Champ | Valeur |
|-------|--------|
| **Intitulé** | Journalisation des événements de sécurité |
| **Finalité** | Sécurité du système, conformité Loi 25-11 |
| **Base légale** | Obligation légale (Loi 25-11 Art.16) |
| **Données traitées** | ID utilisateur, nom, rôle, IP, action, horodatage |
| **Durée conservation** | 5 ans minimum |
| **Type déclaration** | Déclaration ordinaire |

---

## Traitement 5 — Enregistrements de consentement

| Champ | Valeur |
|-------|--------|
| **Intitulé** | Preuve de consentement à la politique de confidentialité |
| **Finalité** | Conformité Loi 18-07 Art.7 (base légale: consentement) |
| **Base légale** | Loi 18-07 Art.7 |
| **Données traitées** | ID utilisateur, horodatage, IP, version politique |
| **Durée conservation** | Durée du traitement + 5 ans |
| **Type déclaration** | Déclaration ordinaire |

---

## Actions ANPDP requises

- [ ] Désigner un Délégué à la Protection des Données (DPD)
- [ ] Soumettre ce registre à l'ANPDP
- [ ] Obtenir l'autorisation pour transfert transfrontalier (Art.22 — hébergement USA)
- [ ] Afficher la politique de confidentialité accessible publiquement
- [ ] Former les agents aux droits des personnes et aux procédures

*⚠️ Validation juridique obligatoire avant dépôt officiel à l'ANPDP*
