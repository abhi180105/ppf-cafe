import { useState, useCallback, memo } from "react";
import { sanitizeString } from "../utils/sanitize";
import styles from "../styles/components/FeedbackSystem.module.css";

function FeedbackSystem() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("feedback");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const devEmail = import.meta.env.VITE_DEV_EMAIL;

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      setStatusMsg("Please fill in all required fields");
      setTimeout(() => setStatusMsg(null), 3000);
      return;
    }

    setSending(true);
    try {
      // Send email using mailto (opens user's email client)
      const subject = `[${type.toUpperCase()}] Message from ${name}`;
      const body = `Name: ${name}\nEmail: ${email || 'Not provided'}\nType: ${type}\n\nMessage:\n${message}`;
      const mailtoLink = `mailto:${devEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink, '_self');
      
      setStatusMsg("Opening your email client... 📧");
      setName("");
      setEmail("");
      setType("feedback");
      setMessage("");
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setSending(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  }, [name, email, type, message, devEmail]);

  return (
    <section className={styles.container}>
      <h2 className={styles.heading}>Send Us a Message 💬</h2>
      <p className={styles.subtitle}>Report bugs, share feedback, or review the website</p>

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
        <input
          type="email"
          placeholder="Your email (optional)"
          value={email}
          onChange={(e) => setEmail(sanitizeString(e.target.value, 100))}
          className={styles.input}
          maxLength={100}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={styles.select}
        >
          <option value="feedback">Website Feedback</option>
          <option value="bug">Bug Report</option>
          <option value="review">Website Review</option>
        </select>
        <textarea
          placeholder="Your message *"
          value={message}
          onChange={(e) => setMessage(sanitizeString(e.target.value, 1000))}
          className={styles.textarea}
          rows="5"
          required
          maxLength={1000}
        />
        <button type="submit" disabled={sending} className={styles.button}>
          {sending ? "Opening..." : "Send via Email"}
        </button>
      </form>

      {statusMsg && <p className={styles.msg}>{statusMsg}</p>}
    </section>
  );
}

export default memo(FeedbackSystem);
