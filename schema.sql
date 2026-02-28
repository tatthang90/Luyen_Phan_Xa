-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bảng `lists` (Danh sách lớn)
CREATE TABLE lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('base', 'review')),
    linked_review_list_id UUID REFERENCES lists(id) ON DELETE SET NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng `vocabularies` (Nội dung từ vựng / hình ảnh / âm thanh)
CREATE TABLE vocabularies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'audio')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng `practice_sessions` (Phiên luyện tập)
CREATE TABLE practice_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    total_words INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    incorrect_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng `practice_details` (Chi tiết từng từ trong phiên)
CREATE TABLE practice_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    vocab_id UUID NOT NULL REFERENCES vocabularies(id) ON DELETE CASCADE,
    is_remembered BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Bật RLS cho tất cả các bảng
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_details ENABLE ROW LEVEL SECURITY;

-- Policy cho `lists`
CREATE POLICY "Users can manage their own lists" ON lists
    FOR ALL USING (auth.uid() = user_id);

-- Policy cho `vocabularies`
CREATE POLICY "Users can manage their own vocabularies" ON vocabularies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM lists 
            WHERE lists.id = vocabularies.list_id 
            AND lists.user_id = auth.uid()
        )
    );

-- Policy cho `practice_sessions`
CREATE POLICY "Users can manage their own practice_sessions" ON practice_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Policy cho `practice_details`
CREATE POLICY "Users can manage their own practice_details" ON practice_details
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM practice_sessions 
            WHERE practice_sessions.id = practice_details.practice_session_id 
            AND practice_sessions.user_id = auth.uid()
        )
    );

-- ==========================================
-- STORAGE POLICIES
-- ==========================================
-- (Chạy riêng tạo bucket `media` trong Storage UI nếu nó chưa tồn tại, hoặc dùng lệnh dưới nếu API nội bộ)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true) 
ON CONFLICT (id) DO NOTHING;

-- Policy để user có thể upload file vào bucket media
CREATE POLICY "Users can upload media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'media' AND auth.uid() = owner
    );

-- Policy để public có thể đọc file từ bucket media
CREATE POLICY "Public media access" ON storage.objects
    FOR SELECT USING (bucket_id = 'media');

-- Policy để user sửa/xóa file của mình
CREATE POLICY "Users can manage their own media" ON storage.objects
    FOR UPDATE USING (bucket_id = 'media' AND auth.uid() = owner);
CREATE POLICY "Users can delete their own media" ON storage.objects
    FOR DELETE USING (bucket_id = 'media' AND auth.uid() = owner);
