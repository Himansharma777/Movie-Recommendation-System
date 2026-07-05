import os
import pickle
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, "movie_dataset.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
MOVIES_PKL = os.path.join(MODELS_DIR, "movies.pkl")
SIMILARITY_PKL = os.path.join(MODELS_DIR, "similarity.pkl")

def init_recommendation(force_retrain=False):
    """
    Initializes the recommendation engine by creating models/ dir,
    loading movie_dataset.csv, calculating Cosine Similarity using TF-IDF,
    and pickling the DataFrame and similarity matrix.
    """
    os.makedirs(MODELS_DIR, exist_ok=True)

    # Check if models already exist
    if not force_retrain and os.path.exists(MOVIES_PKL) and os.path.exists(SIMILARITY_PKL):
        try:
            with open(MOVIES_PKL, "rb") as f:
                df = pickle.load(f)
            with open(SIMILARITY_PKL, "rb") as f:
                similarity_matrix = pickle.load(f)
            print("Loaded cached models successfully.")
            return df, similarity_matrix
        except Exception as e:
            print(f"Error loading pickled models: {e}. Retraining...")

    # Load dataset
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Movie dataset not found at {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)

    # Preprocessing
    # Fill empty fields to prevent errors
    df["genre"] = df["genre"].fillna("")
    df["overview"] = df["overview"].fillna("")

    # Combine features: Genre + Overview
    # We repeat Genre to give it slightly more weight if desired, but a single concatenation works great.
    df["combined_features"] = df["genre"] + " " + df["overview"]

    # TF-IDF Vectorizer
    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(df["combined_features"])

    # Cosine Similarity Matrix
    similarity_matrix = cosine_similarity(tfidf_matrix)

    # Save to pickles
    with open(MOVIES_PKL, "wb") as f:
        pickle.dump(df, f)
    with open(SIMILARITY_PKL, "wb") as f:
        pickle.dump(similarity_matrix, f)

    print("Recommendation model trained and pickled successfully.")
    return df, similarity_matrix

def get_recommendations(movie_title):
    """
    Given a movie title, finds the movie and returns top 5 recommendations.
    Returns:
        tuple: (success (bool), recommendations_list or error_message)
    """
    try:
        df, similarity_matrix = init_recommendation()
    except Exception as e:
        return False, f"Model initialization failed: {str(e)}"

    # Find the movie using case-insensitive match
    matches = df[df["title"].str.lower() == movie_title.lower()]
    if matches.empty:
        # Try to find a partial match to be helpful
        partial_matches = df[df["title"].str.lower().str.contains(movie_title.lower())]
        if not partial_matches.empty:
            matched_title = partial_matches.iloc[0]["title"]
            matches = df[df["title"] == matched_title]
        else:
            return False, "Movie not found. Please choose another movie."

    movie_index = matches.index[0]
    movie_details = matches.iloc[0].to_dict()

    # Get similarity scores for this movie
    similarity_scores = list(enumerate(similarity_matrix[movie_index]))

    # Sort movies based on similarity score (descending)
    # x[1] is the score, x[0] is the index
    similarity_scores = sorted(similarity_scores, key=lambda x: x[1], reverse=True)

    # Exclude the queried movie itself (which will be index with score ~1.0)
    # Filter out itself and fetch top 5
    recommendations = []
    for idx, score in similarity_scores:
        if idx == movie_index:
            continue
        
        row = df.iloc[idx].to_dict()
        # Convert nan ratings/years if any
        row["rating"] = float(row["rating"]) if not pd.isna(row["rating"]) else 0.0
        row["year"] = int(row["year"]) if not pd.isna(row["year"]) else 0
        
        # Add similarity percentage
        row["similarity_score"] = round(float(score) * 100, 1)
        
        recommendations.append(row)
        if len(recommendations) == 5:
            break

    return True, {
        "queried_movie": {
            "title": movie_details["title"],
            "genre": movie_details["genre"],
            "overview": movie_details["overview"],
            "rating": float(movie_details["rating"]),
            "year": int(movie_details["year"]),
            "poster": movie_details["poster"]
        },
        "recommendations": recommendations
    }
