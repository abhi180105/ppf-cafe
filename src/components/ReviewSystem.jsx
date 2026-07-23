// src/components/ReviewSystem.jsx
import { useState, useCallback, memo } from "react";
import { useMenuData, CafeContext } from "../context/CafeContext";
import { useContext } from "react";
import { sanitizeString } from "../utils/sanitize";
import styles from "../styles/components/ReviewSystem.module.css";

function ReviewSystem() {
  const { reviews, loading } = useMenuData();
  const { submitReview } = useContext(CafeContext);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage("Please enter your name");
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSending(true);
    try {
      const success = await submitReview(name.trim(), rating, comment.trim() || "No comment");
      setMessage(success ? "Thanks for your feedback! ❤️" : "Something went wrong. Try again.");
      if (success) {
        setName("");
        setComment("");
        setRating(5);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSending(false);
      setTimeout(() => setMessage(null), 5000);
    }
  }, [name, rating, comment, submitReview]);

  return (
    <section className={styles.container}>
      <h2 className={styles.heading}>Customer Reviews 💬</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          placeholder="Your name *"
          value={name}
          onChange={(e) => setName(sanitizeString(e.target.value, 100))}
          className={styles.input}
          required
          maxLength={100}
        />
        <div className={styles.starRating}>
          <span className={styles.ratingLabel}>Your Rating:</span>
          <div className={styles.stars} role="radiogroup" aria-label="Rating selection">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                className={`${styles.star} ${star <= (hoverRating || rating) ? styles.starFilled : ''}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <textarea
          placeholder="Write your review (optional)..."
          value={comment}
          onChange={(e) => setComment(sanitizeString(e.target.value, 500))}
          className={styles.textarea}
          rows="4"
          maxLength={500}
        />
        <button type="submit" disabled={sending || loading} className={styles.button}>
          {sending ? "Sending..." : "Submit Review"}
        </button>
      </form>

      {message && <p className={styles.msg}>{message}</p>}

      <div className={styles.reviewList}>
        {reviews.length === 0 ? (
          <p className={styles.noReview}>No reviews yet. Be the first! 🌟</p>
        ) : (
          reviews.map((r, i) => (
            <div key={r.id || `review-${i}`} className={styles.reviewCard}>
              <p className={styles.reviewText}>{r.comment}</p>
              <p className={styles.reviewMeta}>
                ⭐ {r.rating}/5 — <strong>{r.name}</strong>
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// Memoize to prevent re-renders when bowl changes
export default memo(ReviewSystem);