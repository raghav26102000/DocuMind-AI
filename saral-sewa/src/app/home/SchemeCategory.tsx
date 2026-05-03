import AutoScrollCSS from "@/components/autoScroll/autoScroll";
import Image from "next/image";

export default function SchemeCategorySection() {
  const items = [
    <div className="category-wrapper">
      <div className="scheme-img-wrapper">
        <Image
          className="scheme-img"
          src="/imgs/category-img.png"
          alt=""
          height={999}
          width={999}
        />
      </div>
      <span className="scheme-count">200 Schemes</span>
      <span className="category-name">Agriculture,Rural & environment</span>
    </div>,
    <div className="category-wrapper">
      <div className="scheme-img-wrapper">
        <Image
          className="scheme-img"
          src="/imgs/category-img.png"
          alt=""
          height={999}
          width={999}
        />
      </div>
      <span className="scheme-count">200 Schemes</span>
      <span className="category-name">
        Banking, Financial services and Insurance
      </span>
    </div>,
    <div className="category-wrapper">
      <div className="scheme-img-wrapper">
        <Image
          className="scheme-img"
          src="/imgs/category-img.png"
          alt=""
          height={999}
          width={999}
        />
      </div>
      <span className="scheme-count">200 Schemes</span>
      <span className="category-name">Education & Learning</span>
    </div>,
    <div className="category-wrapper">
      <div className="scheme-img-wrapper">
        <Image
          className="scheme-img"
          src="/imgs/category-img.png"
          alt=""
          height={999}
          width={999}
        />
      </div>
      <span className="scheme-count">200 Schemes</span>
      <span className="category-name">Health & Wellness</span>
    </div>,
  ];

  return (
    <section className="scheme-categories">
      <AutoScrollCSS items={items} duration={40} gap={20} />
    </section>
  );
}
