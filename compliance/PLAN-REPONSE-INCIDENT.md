# Plan de Réponse aux Incidents de Sécurité
**EPWGCET — Conformité Loi 25-11 Art. 18**
Version 1.0 — Juillet 2025

---

## Modèle de Rapport d'Incident (à remplir dans les 72h)

```
═══════════════════════════════════════════════════════════
  RAPPORT D'INCIDENT DE SÉCURITÉ — CONFIDENTIEL
  EPWGCET — Jijel
═══════════════════════════════════════════════════════════

Date/heure de détection : ___________________________
Date/heure de notification : ________________________
Référence interne : INC-[YYYY-MM-DD]-[NNN]

1. DESCRIPTION DE L'INCIDENT
   Nature : [ ] Intrusion [ ] Fuite de données [ ] Indisponibilité
             [ ] Modification non autorisée [ ] Autre: ___________
   Description détaillée : _________________________________

2. PÉRIMÈTRE AFFECTÉ
   Systèmes touchés : ______________________________________
   Données concernées : ____________________________________
   Nombre d'enregistrements : ______________________________
   Personnes concernées : __________________________________

3. CHRONOLOGIE
   T+00h : Détection — _____________________________________
   T+04h : Évaluation initiale — ___________________________
   T+24h : Mesures d'endiguement — _________________________
   T+72h : Notification ANSSI — Réf. : ____________________

4. CAUSES IDENTIFIÉES
   Cause racine : __________________________________________
   Vecteur d'attaque : _____________________________________

5. MESURES PRISES
   Immédiates : ____________________________________________
   Court terme : ___________________________________________
   Long terme : ____________________________________________

6. NOTIFICATION AUX PERSONNES CONCERNÉES
   Notifié : [ ] Oui [ ] Non — Raison si non : ____________
   Méthode : ______________________________________________
   Date : _________________________________________________

7. CONTACT ANSSI
   Email de notification : incident@anssi.dz (à vérifier)
   Référence dossier ANSSI : ______________________________

8. SIGNATURES
   Responsable de traitement : ____________________________
   DPD : __________________________________________________
   Date : _________________________________________________

═══════════════════════════════════════════════════════════
```

---

## Checklist de réponse immédiate

### Dans les premières heures
- [ ] Isoler le système compromis si nécessaire
- [ ] Préserver les logs (`/api/compliance/audit-log`)
- [ ] Générer le rapport de brèche (`/api/compliance/breach-report`)
- [ ] Alerter le directeur de l'EPWGCET
- [ ] Changer les mots de passe compromis
- [ ] Révoquer les sessions actives suspectes

### Dans les 72 heures
- [ ] Compléter le rapport d'incident ci-dessus
- [ ] Notifier l'ANSSI (Loi 25-11, Art. 18)
- [ ] Évaluer la nécessité de notifier l'ANPDP (Loi 18-07)
- [ ] Notifier les personnes concernées si risque élevé

### Post-incident
- [ ] Rapport post-mortem complet (J+30)
- [ ] Mise à jour du plan de sécurité
- [ ] Formation des équipes si nécessaire
- [ ] Test de pénétration de vérification

---

## Contacts d'urgence

| Entité | Rôle | Contact |
|--------|------|---------|
| ANSSI Algérie | Notification incident (72h) | ⚠️ À vérifier sur site officiel |
| ANPDP | Autorité données personnelles | ⚠️ À vérifier sur site officiel |
| DPD EPWGCET | Délégué Protection Données | ⚠️ À désigner |
| DSI / Admin système | Responsable technique | admin@epwgcet-jijel.dz |
