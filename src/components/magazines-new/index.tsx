'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './styles.module.css';

export default function MagazinesNew() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    image: null as File | null,
    category: '',
    title: '',
    description: '',
    content: '',
    tags: ''
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleBack = () => {
    router.push('/magazines');
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    if (!file.type.match(/image\/(jpg|jpeg|png|gif)/)) {
      alert('JPG, PNG, GIF 파일만 업로드 가능합니다.');
      return;
    }

    setFormData({ ...formData, image: file });

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category) {
      alert('카테고리를 선택해주세요.');
      return;
    }

    console.log('Form submitted:', formData);
    alert('아티클이 등록되었습니다.');
    router.push('/magazines');
  };

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={handleBack}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11.25 4.5L6.75 9L11.25 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>목록으로</span>
      </button>

      <h1 className={styles.heading}>새 아티클 등록</h1>
      <p className={styles.subheading}>IT 매거진에 새로운 기술 아티클을 등록합니다</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>이미지 파일</label>
          <div
            className={`${styles.imageUpload} ${isDragging ? styles.dragging : ''}`}
            onClick={handleImageClick}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <div className={styles.imagePreview}>
                <img src={imagePreview} alt="Preview" />
              </div>
            ) : (
              <div className={styles.uploadContent}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="24" fill="#f3f4f6"/>
                  <path d="M24 18V30M18 24H30" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p className={styles.uploadText}>클릭하여 이미지 선택</p>
                <p className={styles.uploadSubtext}>또는 드래그 앤 드롭</p>
                <p className={styles.uploadHint}>JPG, PNG, GIF (최대 10MB)</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            카테고리 <span className={styles.required}>*</span>
          </label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              <option value="">카테고리를 선택해주세요</option>
              <option value="frontend">프론트엔드</option>
              <option value="backend">백엔드</option>
              <option value="devops">DevOps</option>
              <option value="ai">AI/ML</option>
              <option value="mobile">모바일</option>
              <option value="etc">기타</option>
            </select>
            <svg className={styles.selectIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>제목</label>
          <input
            type="text"
            className={styles.input}
            placeholder="예: 2025년 AI 트렌드: 생성형 AI의 진화"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>한줄 소개</label>
          <input
            type="text"
            className={styles.input}
            placeholder="아티클을 간단히 소개해주세요 (1-2문장)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>상세 내용</label>
          <textarea
            className={styles.textarea}
            placeholder="아티클의 상세 내용을 작성해주세요..."
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={10}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>태그</label>
          <input
            type="text"
            className={styles.input}
            placeholder="#React #TypeScript #JavaScript"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          />
          <p className={styles.hint}>공백으로 구분하여 입력해주세요 (예: #React #Node.js #WebDev)</p>
        </div>

        <button type="submit" className={styles.submitButton}>
          아티클 등록하기
        </button>
      </form>
    </div>
  );
}
