import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 매거진 데이터 타입 정의
export interface MagazineFormData {
  image: File | null;
  category: string;
  title: string;
  description: string;
  content: string;
  tags: string;
}

// Supabase에 저장될 데이터 타입
interface MagazineInsertData {
  image_url: string;
  category: string;
  title: string;
  description: string;
  content: string;
  tags: string[] | null;
}

// 응답 타입
export interface SubmitResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * 태그 문자열을 배열로 변환하는 함수
 * "React TypeScript #Node" → ["React", "TypeScript", "#Node"]
 */
function parseTags(tagsString: string): string[] | null {
  if (!tagsString || tagsString.trim() === '') {
    return null;
  }

  // 공백으로 구분하고, 빈 문자열 제거
  const tags = tagsString
    .trim()
    .split(/\s+/)
    .filter(tag => tag.length > 0);

  return tags.length > 0 ? tags : null;
}

/**
 * 이미지 파일을 Supabase Storage에 업로드하는 함수
 * 버킷명: vibe-coding-storage
 * 파일명 형식: yyyy/mm/dd/{UUID}.jpg
 */
async function uploadImage(file: File): Promise<string | null> {
  try {
    // 현재 날짜 기반 경로 생성
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    // UUID 생성 (crypto API 사용)
    const uuid = crypto.randomUUID();

    // 파일 확장자 추출
    const fileExt = file.name.split('.').pop() || 'jpg';

    // 최종 파일 경로: yyyy/mm/dd/{UUID}.ext
    const filePath = `${year}/${month}/${day}/${uuid}.${fileExt}`;

    // Supabase Storage에 업로드
    const { error } = await supabase.storage
      .from('vibe-coding-storage')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    // 공개 URL 생성
    const { data: publicUrlData } = supabase.storage
      .from('vibe-coding-storage')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Upload image error:', error);
    return null;
  }
}

/**
 * 매거진 등록 커스텀 훅
 */
export async function submitMagazine(formData: MagazineFormData): Promise<SubmitResult> {
  try {
    // 1. 필수 필드 검증
    if (!formData.category) {
      return {
        success: false,
        error: '카테고리를 선택해주세요.'
      };
    }

    if (!formData.title || formData.title.trim() === '') {
      return {
        success: false,
        error: '제목을 입력해주세요.'
      };
    }

    // 2. 이미지 업로드
    let imageUrl = '';
    if (formData.image) {
      const uploadedUrl = await uploadImage(formData.image);
      if (!uploadedUrl) {
        return {
          success: false,
          error: '이미지 업로드에 실패했습니다.'
        };
      }
      imageUrl = uploadedUrl;
    }

    // 3. 태그 파싱
    const tags = parseTags(formData.tags);

    // 4. Supabase에 저장할 데이터 준비
    const insertData: MagazineInsertData = {
      image_url: imageUrl,
      category: formData.category,
      title: formData.title.trim(),
      description: formData.description.trim(),
      content: formData.content.trim(),
      tags: tags
    };

    // 5. Supabase INSERT 실행
    const { data, error } = await supabase
      .from('magazine')
      .insert([insertData])
      .select()
      .single();

    // 6. 에러 처리
    if (error) {
      console.error('Supabase insert error:', error);
      return {
        success: false,
        error: `등록 실패: ${error.message}`
      };
    }

    // 7. 성공 응답
    if (data && data.id) {
      return {
        success: true,
        id: data.id
      };
    }

    // 예상치 못한 경우
    return {
      success: false,
      error: '등록에 실패했습니다. 데이터를 확인해주세요.'
    };

  } catch (error) {
    // 네트워크 오류 등 예외 처리
    console.error('Unexpected error during submit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    };
  }
}
