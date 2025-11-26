// src/components/ContactUs.jsx
import styles from "../styles/components/ContactUs.module.css";

export default function ContactUs() {
  return (
    <section id="contact" className={styles.contactSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>Get in Touch</h2>
        <p className={styles.description}>
          We'd love to hear from you! Whether you have a question about our menu,
          want to provide feedback, or just say hello, feel free to reach out.
        </p>
        <div className={styles.contactInfo}>
          <div className={styles.infoItem}>
            <h3>Our Location</h3>
            <p>123 Cafe Street, Flavor Town, CA 90210</p>
          </div>
          <div className={styles.infoItem}>
            <h3>Call Us</h3>
            <p>+1 (555) 123-4567</p>
          </div>
          <div className={styles.infoItem}>
            <h3>Email Us</h3>
            <p>info@primepattiesfoods.com</p>
          </div>
        </div>
        <form className={styles.contactForm} onSubmit={(e) => { e.preventDefault(); alert('Message sent! We\'ll get back to you soon.'); e.target.reset(); }}>
          <h3>Send us a message</h3>
          <input type="text" placeholder="Your Name" className={styles.inputField} required />
          <input type="email" placeholder="Your Email" className={styles.inputField} required />
          <textarea placeholder="Your Message" rows="5" className={styles.textareaField} required></textarea>
          <button type="submit" className={styles.submitButton}>Send Message</button>
        </form>
      </div>
    </section>
  );
}
