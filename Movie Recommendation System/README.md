# Movie Recommendation System

An elegant, production-grade content-based movie recommendation system built with **Python (Flask)** on the backend and a premium **Netflix/IMDb-style dashboard (HTML, CSS, JS)** on the frontend. The system processes movie overview descriptions and genres using TF-IDF vectorization and matches them via Cosine Similarity.

---

## 🌟 Key Features

- **Autocomplete Search**: Real-time movie filtering as you type, supporting keyboard arrows and selection.
- **Content-Based Filtering**: Combines genre + overview and generates a TF-IDF matrix to measure film correlation via Cosine Similarity.
- **Interactive Movie Cards**: Displays matches with detailed metadata (year, rating, overview), Unsplash cover art, custom hover scales, and animated glow effects.
- **Recursive Modal Discovery**: Clicking any card opens a detailed modal display. Within this modal, a "You May Also Like" grid recommends related movies, allowing users to recursively explore films.
- **Favorites & Search History**: Add/remove favorites and track recent searches. All state is persisted in the browser via `LocalStorage`.
- **Animated Statistics**: Dynamically counts total movies, genres, and recommendations generated since server startup.
- **Light/Dark Mode Theme**: Easily toggle the look and feel, automatically saved for your next visit.
- **Cache Optimization**: Saves pre-processed model pickles (`similarity.pkl` and `movies.pkl`) in `models/` directory for fast lookup speeds.
- **Error Handling**: Graceful fallback UI elements for missing titles, empty searches, and network dropouts.

---

## 📁 Folder Structure

```
Movie-Recommendation-System/
│
├── app.py                  # Main Flask backend application router
├── requirements.txt        # Backend dependencies
├── README.md               # Project documentation
├── movie_dataset.csv       # Movie dataset containing 372 items
│
├── models/
│   ├── similarity.pkl      # Pickled Cosine Similarity matrix (cache)
│   └── movies.pkl          # Pickled pandas DataFrame (cache)
│
├── static/
│   ├── css/
│   │     style.css         # CSS stylesheet containing design system & animations
│   └── js/
│         script.js         # Frontend interactive client-side script
│
├── templates/
│   └── index.html          # Cinematic dark dashboard template
│
└── utils/
      recommendation.py     # TF-IDF & Cosine Similarity logic
```

---

## ⚙️ Installation & Run Instructions

### 1. Prerequisites
Ensure you have **Python 3.8+** installed on your system.

### 2. Install Dependencies
Open your terminal in the project directory and run:
```bash
pip install -r requirements.txt
```

### 3. Launch the Application
Start the Flask development server:
```bash
python app.py
```

### 4. Open in Browser
Visit the following URL:
```
http://127.0.0.1:5000
```

---

## 🚀 How it Works (Recommendation Logic)

1. **Feature Construction**: The recommendation engine combines the `genre` and `overview` fields for each movie to create a detailed feature profile.
2. **Text Representation**: We fit a `TfidfVectorizer` to this text data, removing standard English stop words (like *the*, *is*, *and*). This translates human text into numerical TF-IDF feature vectors.
3. **Similarity Index**: We calculate the `Cosine Similarity` between all movie vectors. This outputs a matrix where each cell represents the similarity score (from `0.0` to `1.0`) between two movies.
4. **Caching**: We pickle the resulting dataframes and similarity matrices to `models/` to bypass recalculation on future queries, resulting in sub-millisecond response times.
5. **Retrieval**: When a movie is searched, its index is located. The top 5 indices with the highest cosine values (excluding itself) are extracted and returned to the browser client.

---

## 🔮 Future Improvements

1. **TMDB Live API Integration**: Fetch real-time movie posters and trailers using the TMDB API.
2. **Collaborative Filtering**: Implement hybrid recommendations by combining user rating histories with description content.
3. **User Accounts**: Add backend authentication to store profiles and favorites databases securely.
4. **Cast & Crew Features**: Incorporate directors and actors into TF-IDF features to recommend films by similar personnel.
