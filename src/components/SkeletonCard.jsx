// src/components/SkeletonCard.jsx
import { memo } from "react";
import styles from "../styles/components/SkeletonCard.module.css";

function SkeletonCard() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.imageWrapper}>
        <div className={styles.imageSkeleton}></div>
      </div>
      <div className={styles.content}>
        <div className={styles.titleSkeleton}></div>
        <div className={styles.descSkeleton}></div>
        <div className={styles.descSkeleton} style={{ width: '70%' }}></div>
        <div className={styles.footer}>
          <div className={styles.priceSkeleton}></div>
          <div className={styles.buttonSkeleton}></div>
        </div>
      </div>
    </div>
  );
}

// Memoize since SkeletonCard has no props and never needs to re-render
export default memo(SkeletonCard);