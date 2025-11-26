// src/components/AboutUs.jsx
import styles from "../styles/components/AboutUs.module.css";

export default function AboutUs() {
  return (
    <section id="about" className={styles.aboutSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>About Prime Patties & Foods</h2>
        <p className={styles.description}>
          Welcome to Prime Patties & Foods, where every dish tells a story of passion, quality, and flavor.
          Nestled in the heart of the city, our cafe is a haven for food lovers seeking a delightful culinary experience.
        </p>
        <p className={styles.description}>
          We pride ourselves on using the freshest, locally sourced ingredients to craft a diverse menu
          that caters to all tastes. From our signature gourmet burgers to refreshing beverages and
          decadent desserts, each item is prepared with meticulous care and a touch of creativity.
        </p>
        <p className={styles.description}>
          Our cozy ambiance, friendly staff, and commitment to excellence make Prime Patties & Foods
          the perfect spot for a quick bite, a leisurely meal, or a gathering with loved ones.
          Come and discover your new favorite dish with us!
        </p>
        <div className={styles.highlights}>
          <div className={styles.highlightItem}>
            <h3>Fresh Ingredients</h3>
            <p>Sourced daily from local farms for unparalleled taste.</p>
          </div>
          <div className={styles.highlightItem}>
            <h3>Artisan Craftsmanship</h3>
            <p>Every dish is a masterpiece, prepared with passion and precision.</p>
          </div>
          <div className={styles.highlightItem}>
            <h3>Cozy Atmosphere</h3>
            <p>A warm and inviting space perfect for any occasion.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
