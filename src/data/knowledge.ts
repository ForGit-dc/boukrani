// CLIENT-SIDE UI data only.
//
// The bot's behavior prompt and full knowledge base now live SERVER-SIDE in
// supabase/functions/_shared/knowledge.ts (so a visitor can't override the prompt
// or read the raw base). Human source of truth: /KNOWLEDGE_BASE.md + /SYSTEM_PROMPT.md.
//
// This file only holds the suggestion buttons shown in the UI. The suggestedQA
// answers are returned to the user verbatim (they do NOT go through the model),
// so keep every fact here in sync with KNOWLEDGE_BASE.md - no invented numbers.

export const suggestedPrompts = [
  "Give me a 30-second intro.",
  "Tell me about your EGC 2026 paper.",
  "What concrete impact have you delivered?",
  "Why should a team hire you?",
];

export const suggestedQA = [
  {
    id: "intro30",
    label_en: "30-sec intro",
    label_fr: "Intro 30 s",
    user_en: "Give me a 30-second intro.",
    user_fr: "Présente-toi en 30 secondes.",
    answer_en: "I'm Mohamed Boukrani, a Data Scientist / AI Engineer with dual engineering degrees (ENSAI & INSEA), based in Paris. I build data and AI systems end to end: label-noise research at Orange published as a first-author paper at EGC 2026, time-series and kriging models at CREST, and GenAI projects with RAG, LangChain and FAISS. Ask me about a project, my paper, or how I can help your team.",
    answer_fr: "Je suis Mohamed Boukrani, Data Scientist / AI Engineer double diplômé (ENSAI & INSEA), basé à Paris. Je construis des systèmes de données et d'IA de bout en bout : recherche sur le label noise chez Orange publiée en premier auteur à EGC 2026, séries temporelles et krigeage au CREST, et projets GenAI avec RAG, LangChain et FAISS. Demande-moi un projet, mon article, ou comment je peux aider ton équipe."
  },
  {
    id: "egc_paper",
    label_en: "EGC 2026 paper",
    label_fr: "Article EGC 2026",
    user_en: "Tell me about your EGC 2026 paper.",
    user_fr: "Parle-moi de ton article EGC 2026.",
    answer_en: "It's my signature work: \"Fonctions d'influences pour la détection d'exemples mal étiquetés : une étude comparative\", published at EGC 2026 (RNTI-E-42, pages 229-240), first author with Pierre Nodet and Vincent Lemaire of Orange Research. We benchmarked influence-function methods to detect mislabeled training data: approximately 136,000 models trained across 14 text and tabular datasets, under random (NCAR) and realistic (NNAR) label noise. You can read it at editions-rnti.fr/?inprocid=1003082&lg=fr.",
    answer_fr: "C'est mon travail signature : « Fonctions d'influences pour la détection d'exemples mal étiquetés : une étude comparative », publié à EGC 2026 (RNTI-E-42, pages 229-240), en premier auteur avec Pierre Nodet et Vincent Lemaire d'Orange Research. Nous avons benchmarké les fonctions d'influence pour détecter les données mal étiquetées : environ 136 000 modèles entraînés sur 14 datasets textuels et tabulaires, sous bruit aléatoire (NCAR) et réaliste (NNAR). L'article est sur editions-rnti.fr/?inprocid=1003082&lg=fr."
  },
  {
    id: "impact",
    label_en: "Concrete impact",
    label_fr: "Impact concret",
    user_en: "What concrete impact have you delivered?",
    user_fr: "Quel impact concret as-tu livré ?",
    answer_en: "At Orange, filtering mislabeled data lifted the balanced accuracy of fraud-detection models from 75% to 84% (+9%). At CREST, my hybrid SARIMA-LSTM cut temperature forecasting error to RMSE 5.152 (versus 6.845 for SARIMA alone), and my DNN-based kriging interpolated temperatures across 1,799 French zones with MAE 1.29. On my personal medical-data project, an SVM reached 83% precision over 7 merged databases. Each number belongs to its own project - happy to detail any of them.",
    answer_fr: "Chez Orange, le filtrage des données mal étiquetées a fait passer la balanced accuracy des modèles de détection de fraude de 75% à 84% (+9%). Au CREST, mon hybride SARIMA-LSTM a réduit l'erreur de prévision des températures à un RMSE de 5.152 (contre 6.845 pour SARIMA seul), et mon krigeage à base de DNN a interpolé les températures sur 1 799 zones avec un MAE de 1.29. Sur mon projet perso de données médicales, un SVM a atteint 83% de précision sur 7 bases fusionnées. Chaque chiffre appartient à son propre projet - je détaille volontiers."
  },
  {
    id: "why_hire",
    label_en: "Why hire you?",
    label_fr: "Pourquoi te recruter ?",
    user_en: "Why should a team hire you?",
    user_fr: "Pourquoi une équipe devrait-elle te recruter ?",
    answer_en: "Because I build data and AI systems end to end, from database engineering to GenAI architectures. At Orange I designed the ETL for 14 datasets, ran a benchmark of approximately 136,000 models and published the results as a first-author paper at EGC 2026. I pair that research rigor (dual ENSAI & INSEA degrees) with hands-on engineering: RAG with LangChain and FAISS, FastAPI, Docker, SQL, GCP. I'm open to opportunities - reach me at mohamedboukrani7@gmail.com.",
    answer_fr: "Parce que je construis des systèmes de données et d'IA de bout en bout, de l'ingénierie des bases de données aux architectures GenAI. Chez Orange, j'ai conçu l'ETL de 14 datasets, mené un benchmark d'environ 136 000 modèles et publié les résultats en premier auteur à EGC 2026. J'allie cette rigueur de recherche (double diplôme ENSAI & INSEA) à l'ingénierie concrète : RAG avec LangChain et FAISS, FastAPI, Docker, SQL, GCP. Je suis à l'écoute du marché - écris-moi à mohamedboukrani7@gmail.com."
  },
  {
    id: "genai_nlp",
    label_en: "GenAI & NLP",
    label_fr: "GenAI & NLP",
    user_en: "What's your GenAI / NLP work?",
    user_fr: "Quel est ton travail en GenAI / NLP ?",
    answer_en: "Two concrete builds: LLM-RAG, a retrieval-augmented pipeline over financial PDF reports (LangChain, LlamaParse for precise parsing, FAISS for vector search), and Sentiment-Analysis-NLP, a RoBERTa sentiment pipeline for customer reviews served through a FastAPI REST API with a Streamlit UI. My stack also covers Transformers, SpaCy and TensorFlow. Both repos are on my GitHub (/mohamedcoder07).",
    answer_fr: "Deux réalisations concrètes : LLM-RAG, un pipeline RAG sur des rapports financiers PDF (LangChain, LlamaParse pour un parsing précis, FAISS pour la recherche vectorielle), et Sentiment-Analysis-NLP, un pipeline de sentiments RoBERTa pour avis clients servi via une API REST FastAPI avec une interface Streamlit. Mon stack couvre aussi Transformers, SpaCy et TensorFlow. Les deux repos sont sur mon GitHub (/mohamedcoder07)."
  },
  {
    id: "timeseries",
    label_en: "Time series & kriging",
    label_fr: "Séries temporelles & krigeage",
    user_en: "Tell me about your forecasting work at CREST.",
    user_fr: "Parle-moi de ton travail de prévision au CREST.",
    answer_en: "At CREST I modeled Météo-France temperatures in two ways. Temporal: SARIMA, LSTM, then a hybrid additive SARIMA-LSTM that cut the error to RMSE 5.152 versus 6.845 for SARIMA alone. Spatial: ordinary kriging with a semi-variogram fitted by a deep neural network, reaching R² 99.25% on test and MAE 1.29 across 1,799 zones (temperatures of 17 July 2024). Two separate sub-projects, each with its own figures.",
    answer_fr: "Au CREST, j'ai modélisé les températures Météo-France de deux façons. Temporel : SARIMA, LSTM, puis un hybride additif SARIMA-LSTM qui a réduit l'erreur à un RMSE de 5.152 contre 6.845 pour SARIMA seul. Spatial : krigeage ordinaire avec un semi-variogramme ajusté par un réseau de neurones profond, atteignant un R² de 99.25% en test et un MAE de 1.29 sur 1 799 zones (températures du 17 juillet 2024). Deux sous-projets distincts, chacun avec ses propres chiffres."
  },
  {
    id: "contact",
    label_en: "Contact details",
    label_fr: "Coordonnées",
    user_en: "How can I contact you?",
    user_fr: "Comment te contacter ?",
    answer_en: "You can reach me by email at mohamedboukrani7@gmail.com or by phone at +33 7 58 80 31 87. I'm also on LinkedIn (/in/mohamed-boukrani-220046210) and GitHub (/mohamedcoder07).",
    answer_fr: "Tu peux me joindre par email à mohamedboukrani7@gmail.com ou par téléphone au +33 7 58 80 31 87. Je suis aussi sur LinkedIn (/in/mohamed-boukrani-220046210) et GitHub (/mohamedcoder07)."
  }
];
