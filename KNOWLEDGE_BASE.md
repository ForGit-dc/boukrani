# Knowledge Base - Mohamed Boukrani (Source of Truth)

> **Purpose**: single, contradiction-free source of truth for the conversational portfolio bot.
> **Anti-hallucination rule**: the bot answers ONLY from this file. Facts in `CANONICAL_FACTS` are injected verbatim and never paraphrased. If something is not here, the bot says it doesn't have the info.
> **Language policy**: base content in English; bot auto-detects and replies in FR / EN / AR.
> **Conflict rule**: when CV and LinkedIn disagree, the CV wins (one operator-decided exception logged in RESOLVED DECISIONS).
> **Last consolidated**: 2026-07-12.

**Verification legend**
- OK = verified from a primary doc in hand (CV PDF, LinkedIn PDF export, the two full internship reports, the published EGC paper PDF, certificate PDFs)
- LIVE = re-fetched live this session (GitHub profile, RNTI page)
- CONF = conflict resolved (rule or operator decision, see RESOLVED DECISIONS)
- ASK = client-asserted or operator-instructed only, no document in the current folder

---

## 1. CANONICAL_FACTS (injected verbatim - the anti-hallucination core)

### Identity
- **Name**: Mohamed Boukrani
- **Headline**: Data Scientist / AI Engineer - end-to-end data and AI systems, from database engineering to generative-AI architectures (NLP, RAG, LLM) (CV summary) OK
- **Education**: dual engineering degree, ENSAI & INSEA OK
- **Location**: Paris, France OK
- **Status**: open to opportunities (a l'ecoute du marche) ASK (operator instruction 2026-07-12)

### Contacts
- **Email**: mohamedboukrani7@gmail.com OK (CV + LinkedIn export)
- **Phone**: +33 7 58 80 31 87 OK (CV; client approved publishing)
- **LinkedIn**: linkedin.com/in/mohamed-boukrani-220046210 OK (LinkedIn export + client message)
- **GitHub**: github.com/mohamedcoder07 OK (client message 2026-07-12, profile fetched live)
- **Personal site**: OMITTED from the portfolio and the bot on the operator's instruction of 2026-07-12 (the client's existing mohamedboukrani.github.io site is not referenced anywhere; the bot must not share it).
- **Disclosure**: email + phone may be shared on request (client's decision).

### Languages
- French - fluent (courant) OK
- English - professional working (B2+, TOEIC 860/990) OK
- Arabic - native OK

### Experience (most recent first)
| Role | Org | Dates | Location |
|---|---|---|---|
| Data Scientist & ML Research Engineer | Orange (Orange Innovation / Orange Research, ADIS team) | Apr 2025 - Sept 2025 | Chatillon, France OK |
| Data Scientist | CREST (ENSAI campus) | Jun 2024 - Aug 2024 | Rennes (Bruz), France OK CONF |
| Data Analyst | Haut Commissariat au Plan (HCP) | Jul 2022 (2 months) | Agadir, Morocco OK (LinkedIn only) |

> CONF Orange title: LinkedIn says "Data Scientist"; the CV's "Data Scientist & ML Research Engineer" wins (CV rule).
> CONF CREST title: CV says "Machine Learning Engineer"; set to "Data Scientist" by operator decision 2026-07-12 (see RESOLVED DECISIONS).
> HCP appears only on LinkedIn, not the CV: kept with zero detail claims; the bot redirects for specifics.

### Education
- **ENSAI** - Diplome d'ingenieur, double degree, Data Science & Statistics, 2023 - 2025, Rennes, France. OK
- **INSEA** - Diplome d'ingenieur d'Etat, Data Science, 2021 - 2023, Rabat, Morocco. OK
- **Universite Ibn Zohr** - DEUG, Mathematical Sciences and Applications, 2019 - 2021, Morocco. OK (LinkedIn export)
- **Baccalaureat** - Mathematical Sciences B (biof), 2016 - 2019. OK (LinkedIn export; KB background, not a landing item)

### Headline metrics (verbatim, never paraphrase the numbers)
- Orange: ETL pipeline for **14** textual and tabular datasets OK (CV; report table 5.2 lists exactly 14); benchmark of **approximately 136,000** trained models OK (report 5.1: "environ 136 000 modeles"); balanced accuracy **from 75% to 84% (+9%)** after filtering mislabeled data ASK (CV only; the report gives per-dataset tables C.1/C.2, not this aggregate).
- CREST temporal: hybrid additive SARIMA-LSTM **RMSE 5.152 / MAE 4.049**; SARIMA alone **RMSE 6.845 / MAE 5.501**; multiplicative hybrid **RMSE 6.942 / MAE 4.529** OK (report table 3.2; the CV rounds the headline to "5,15 RMSE").
- CREST spatial (kriging, temperatures of 17 July 2024, **1,799** zones): DNN semi-variogram fit **R2 99.25%** on test (exp. 88.61%, gauss. 88.82%); DNN-OK predictions **MAE 1.29 / RMSE 2.24** OK (report tables 4.3 and 4.4; the report prose once swaps MAE and RMSE, the tables are authoritative).
- Medical data project: **7** merged databases, SVM **83% precision** (vs Elastic Net, cross-validation) OK (CV).
- TOEIC **860/990** OK (CV).

---

## 2. CURATED NOTES (first-person English, for retrieval)

**Orange - Data Scientist & ML Research Engineer (Apr - Sept 2025, Chatillon).** End-of-studies research internship in the ADIS team (Automated Data Intelligence at Scale) at Orange Innovation / Orange Research. I worked on detecting mislabeled training data (label noise) with influence functions: I designed a complete ETL pipeline to ingest and prepare 14 textual and tabular datasets, then ran an exhaustive benchmark of approximately 136,000 trained models comparing state-of-the-art influence-function variants (classic influence, RelatIF, gradient-based TracIn / Agra-style methods, relabeling influence) under NCAR (random) and NNAR (realistic) class noise. Filtering the detected mislabeled data improved model balanced accuracy from 75% to 84% (+9%), making fraud-detection models more robust. Stack here: Python, scikit-learn (SGDClassifier, MLPClassifier), TF-IDF vectorization, OneHotEncoder, RBF-kernel random Fourier features, the open-source "mislabeled" package. The work became my first-author paper at EGC 2026.

**CREST - Data Scientist (Jun - Aug 2024, Rennes/Bruz).** Research internship on "building artificial weather stations" from Meteo-France temperature data. Temporal track: SARIMA and LSTM forecasters, then a hybrid additive SARIMA-LSTM that cut the error to RMSE 5.152 / MAE 4.049 versus RMSE 6.845 for SARIMA alone. Spatial track: ordinary kriging to fill areas without weather stations, fitting the semi-variogram with a deep neural network; on the temperatures of 17 July 2024 across 1,799 zones of metropolitan France, the DNN fit reached R2 99.25% on test and the DNN-based kriging predicted with MAE 1.29 / RMSE 2.24. The two tracks are separate sub-projects: never merge their figures.

**Haut Commissariat au Plan - Data Analyst (Jul 2022, Agadir).** Morocco's national statistics and planning institution. No mission details are documented; the bot may state the role exists and must redirect to direct contact for anything more.

---

## 3. PUBLICATIONS & PUBLIC WORK

**"Fonctions d'influences pour la detection d'exemples mal etiquetes : une etude comparative"** OK LIVE
- FIRST author: Mohamed Boukrani (Orange Research, France + ENSAI, Rennes), with Pierre Nodet and Vincent Lemaire (Orange Research).
- Published at EGC 2026 (Extraction et Gestion des Connaissances), proceedings RNTI-E-42, pages 229-240.
- Online: https://editions-rnti.fr/?inprocid=1003082&lg=fr (no DOI shown on the RNTI page).
- Comparative study of influence-function methods to (i) identify mislabeled training examples and (ii) filter them to improve learning performance in classification. Published outcome of the Orange internship.
- The LinkedIn export lists an English title, "Influence Functions for Mislabeled Data Detection: A Comparative Study"; the CV shorthand is "Detection de label noise par Fonctions d'Influence". Same single paper.

---

## 4. PROJECTS (personal - GitHub: github.com/mohamedcoder07, profile re-fetched live 2026-07-12)

- **LLM-RAG** (github.com/mohamedcoder07/LLM-RAG) LIVE - GenAI RAG pipeline for analyzing financial reports in PDF. Stack: LangChain, LlamaParse (precise document parsing), FAISS, LLM. No accuracy metric documented (do not invent one). Distinctive marker: the only project with LangChain + LlamaParse + FAISS.
- **Sentiment-Analysis-NLP** (github.com/mohamedcoder07/Sentiment-Analysis-NLP) LIVE - complete NLP pipeline using RoBERTa (Transformers) for sentiment analysis of customer reviews, exposed as a FastAPI REST API with a dedicated Streamlit interface. Distinctive marker: the only project with RoBERTa + FastAPI + Streamlit.
- **Medical data modeling** (no public repo) OK - merged and cleaned 7 complex medical databases with correction of data-entry anomalies; compared SVM and Elastic Net by cross-validation; SVM reached 83% precision. Stack: Python, R. Distinctive markers: the only project using R, the only one on medical data; its 83% must never be confused with Orange's 84% balanced accuracy.
- **Churn study** (no public repo) OK - relational schema + ETL pipeline from CSV files into PostgreSQL; churn factors identified with advanced SQL. Stack: SQL, PostgreSQL. No model metric: SQL analysis, not a trained classifier.
- Other visible GitHub repos (PyTorch-CNN-FashionMNIST, Classifying-Emails-Naive-Bayes-Method, LinearRegression-with-python, data_manipulation): coursework-level, no verified details beyond the names; NOT in the runtime KB (see RESOLVED DECISIONS).

---

## 5. AWARDS & DISTINCTIONS

- First-author paper published at EGC 2026 (see PUBLICATIONS). OK LIVE
- **Certifications**:
  - HCIA-AI Course, Huawei iLearningX, 31 Jul 2022, certificate code EBG2020CCHW1100087MOOC202207314353. OK
  - Machine Learning Introduction for Everyone, IBM Skills Network via Coursera, 24 Jul 2022, verify 2D97Y7AMX47R. OK
  - Data Analysis with Python, IBM Skills Network via Coursera, 1 Sep 2022, verify LL58EQVU6X2P. OK
  - Python for Data Science, AI & Development, IBM Skills Network via Coursera, 1 Sep 2022, verify X4Y52WN4GTE6. OK
  - Data Analysis Using Python, University of Pennsylvania via Coursera, 24 Jan 2023, verify BH5HL26NVALB. OK
  - Data Visualization with R, IBM Skills Network via Coursera, 25 Jul 2022. ASK (PDF verified in the 2026-07-07 intake run; absent from the current folder; kept on operator instruction 2026-07-12)
  - TOEIC 860/990 (B2+). OK

---

## 6. RESOLVED DECISIONS (locked 2026-07-12)

1. **Orange title**: "Data Scientist & ML Research Engineer" (CV wins over LinkedIn's "Data Scientist").
2. **CREST title**: "Data Scientist" per the operator's decision of 2026-07-12 (the one deliberate exception to the CV rule; CV says "Machine Learning Engineer"). CONFIRMED explicitly by the operator at the review gate ("CREST = Data Scientist").
3. **EGC paper**: PUBLISHED (verified against the paper PDF and the RNTI page); the CV's "nominee" wording is superseded.
4. **"30 influence-function methods"** (from an earlier intake run): removed, not found verbatim in the report. Scale figures are 14 datasets and approximately 136,000 models.
5. **RMSE precision**: the KB uses the report-exact 5.152; the CV's rounded "5,15" is acceptable on the landing.
6. **Small GitHub repos**: omitted from the runtime KB (no verified details beyond names).
7. **Phone**: publishable (client approved).
8. **Personal site mohamedboukrani.github.io**: OMITTED everywhere (landing, KB, chat UI) on the operator's instruction of 2026-07-12.
9. **Global rule**: whenever CV and LinkedIn disagree, the CV wins (except decision 2).

---

## 7. SOURCES / VERIFICATION LOG

Primary source of truth: `intake/boukrani/PROFILE.md` (consolidated 2026-07-12). Document keys below refer to the gitignored `boukrani/` folder.

| Fact | Value (verbatim) | Source | Notes |
|---|---|---|---|
| Name, title, location | Mohamed Boukrani, Data Scientist / AI Engineer, Paris | PROFILE sec 1 (CV header) | OK |
| Status | a l'ecoute du marche | PROFILE sec 1 | ASK, operator 2026-07-12 |
| Email | mohamedboukrani7@gmail.com | PROFILE sec 1 (CV + LinkedIn export) | OK |
| Phone | +33 7 58 80 31 87 | PROFILE sec 1 (CV) | OK, publishable |
| LinkedIn | /in/mohamed-boukrani-220046210 | PROFILE sec 1 (LinkedIn export) | OK |
| GitHub | github.com/mohamedcoder07 | PROFILE sec 1 (client message) | LIVE re-fetched 2026-07-12 |
| Personal site | omitted (operator instruction 2026-07-12) | PROFILE sec 1 (LinkedIn export) | removed from KB, landing and chat UI |
| Languages | FR courant; EN B2+ TOEIC 860/990; AR native | PROFILE sec 3 (CV) | OK |
| ENSAI | Diplome d'ingenieur, double degree, 2023 - 2025, Rennes | PROFILE sec 4 (CV) | OK |
| INSEA | Diplome d'ingenieur d'Etat, Data Science, 2021 - 2023, Rabat | PROFILE sec 4 (CV + LinkedIn) | OK |
| Ibn Zohr DEUG | Sciences mathematiques et applications, 2019 - 2021 | PROFILE sec 4 (LinkedIn export) | OK |
| Baccalaureat | Science mathematiques B biof, 2016 - 2019 | PROFILE sec 4 (LinkedIn export) | OK |
| Orange role + dates | Data Scientist & ML Research Engineer, Avr. 2025 - Sept. 2025, Chatillon | PROFILE sec 5 (CV) | CONF vs LinkedIn title |
| Orange team | ADIS (Automated Data Intelligence at Scale), IT-S unit | PROFILE sec 5 (memoire ch.1 + remerciements) | OK |
| 14 datasets | 14 textual and tabular datasets | PROFILE sec 5 (CV; memoire table 5.2) | OK, cross-checked |
| 136,000 models | approximately 136,000 (environ 136 000) | PROFILE sec 5 (memoire 5.1) | OK |
| Balanced accuracy | from 75% to 84% (+9%) | PROFILE sec 5 (CV only) | ASK, aggregate not in report tables |
| Influence variants | classic, RelatIF, TracIn / Agra-style, relabeling | PROFILE sec 5 (memoire ch.4) | OK |
| Noise settings | NCAR (random), NNAR (realistic) | PROFILE sec 5 (memoire abstract) | OK |
| Orange stack | Python, scikit-learn (SGDClassifier, MLPClassifier), TF-IDF, OneHotEncoder, RBF Fourier features, "mislabeled" package | PROFILE sec 5 (memoire ch.5) | OK |
| CREST role + dates | Data Scientist, Juin 2024 - Aout 2024, Rennes (Bruz) | PROFILE sec 5 | CONF, operator decision on title |
| Hybrid model | additive SARIMA-LSTM RMSE 5.152 / MAE 4.049 | PROFILE sec 5 (rapport-2a table 3.2) | OK; CV rounds to 5,15 |
| SARIMA baseline | RMSE 6.845 / MAE 5.501 | PROFILE sec 5 (rapport-2a table 3.2) | OK |
| Multiplicative hybrid | RMSE 6.942 / MAE 4.529 | PROFILE sec 5 (rapport-2a table 3.2) | OK |
| Kriging R2 | DNN 99.25% test (exp. 88.61%, gauss. 88.82%) | PROFILE sec 5 (rapport-2a table 4.3) | OK |
| Kriging errors | DNN-OK MAE 1.29 / RMSE 2.24 | PROFILE sec 5 (rapport-2a table 4.4) | OK; prose swaps them once, table wins |
| Kriging data | temperatures of 17 July 2024, 1,799 zones | PROFILE sec 5 (rapport-2a 4.3.1) | OK |
| Data origin | Meteo-France | PROFILE sec 5 (rapport-2a 2.2) | OK |
| HCP role | Data Analyst, Jul 2022, 2 months, Agadir | PROFILE sec 5 (LinkedIn export only) | OK source, no details |
| LLM-RAG project | LangChain, LlamaParse, FAISS, LLM; financial PDFs | PROFILE sec 6 (CV); repo confirmed by client | OK LIVE |
| Sentiment project | RoBERTa, FastAPI, Streamlit | PROFILE sec 6 (CV); repo confirmed by client | OK LIVE |
| Medical project | 7 databases, SVM 83% precision, vs Elastic Net, cross-validation, Python + R | PROFILE sec 6 (CV) | OK |
| Churn project | SQL, PostgreSQL, ETL from CSV, relational schema | PROFILE sec 6 (CV) | OK |
| EGC paper | first author, RNTI-E-42, pages 229-240, with P. Nodet and V. Lemaire | PROFILE sec 7 (paper PDF 1003082.pdf + RNTI page) | OK LIVE |
| Certifications | see section 5 above with verify codes | PROFILE sec 8 (certificate PDFs) | OK except Data Viz with R (ASK) |
| Skills inventory | CV "Competences" block | PROFILE sec 8 | OK, general skills only |

---

## 8. OPEN ITEMS

1. RESOLVED 2026-07-12: the "75% to 84% (+9%)" headline was explicitly confirmed by the operator at the review gate ("75% -> 84% gardé en chiffre-phare").
2. "Data Visualization with R" certificate: the PDF is no longer in the documents folder. Can the client re-supply it? (Kept on operator instruction.)
3. RESOLVED 2026-07-12: CREST title confirmed by the operator at the review gate: CREST = "Data Scientist", Orange = "Data Scientist & ML Research Engineer".
4. HCP mission details: none documented. If Mohamed wants this role fleshed out, provide a sentence or two of confirmed facts.
5. No metrics documented for LLM-RAG, Sentiment-Analysis-NLP, and the churn study: fine as is (the bot must not invent any).
