import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { X, Home } from 'lucide-react';

interface Vocabulary {
    id: string;
    content_type: 'text' | 'image' | 'audio';
    content: string;
    last_5_results?: boolean[];
}

export default function PracticeSessionPage() {
    const { listId } = useParams();
    const [searchParams] = useSearchParams();
    const { session } = useAuth();
    const navigate = useNavigate();

    const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [status, setStatus] = useState<'loading' | 'countdown' | 'showing' | 'finished'>('loading');
    const [countdownValue, setCountdownValue] = useState(3);
    const [results, setResults] = useState<{ vocab_id: string; is_remembered: boolean }[]>([]);

    // Biến phụ chống click liên tiếp và hỗ trợ lưu db chưa hoàn thành
    const isSaving = useRef(false);
    const resultsRef = useRef<{ vocab_id: string; is_remembered: boolean }[]>([]);

    // Settings
    const order = searchParams.get('order') || 'random';
    const showFeedback = searchParams.get('feedback') === 'true';
    const timeLimitStr = searchParams.get('timeLimit');
    const timeLimit = timeLimitStr ? parseInt(timeLimitStr, 10) * 1000 : 2000;

    useEffect(() => {
        if (listId) fetchVocabularies();
    }, [listId]);

    const fetchVocabularies = async () => {
        // Fetch vocabularies - thử lấy đủ các cột mới cho Phase 5
        let rawData: any[] = [];
        const { data, error } = await supabase
            .from('vocabularies')
            .select('id, content_type, content, last_5_results, parent_vocab_id')
            .eq('list_id', listId)
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('Lỗi khi tải từ vựng (Phase 7):', error);
            // Fallback nếu database chưa được update cột mới
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('vocabularies')
                .select('id, content_type, content')
                .eq('list_id', listId)
                .order('created_at', { ascending: true });

            if (fallbackError || !fallbackData || fallbackData.length === 0) {
                alert('Danh sách này chưa có từ vựng nào hoặc lỗi kết nối!');
                navigate(`/list/${listId}`);
                return;
            }
            console.warn('Đang chạy ở chế độ Fallback (Thiếu cột last_5_results hoặc parent_vocab_id)');
            rawData = fallbackData;
        } else {
            if (!data || data.length === 0) {
                alert('Danh sách này chưa có từ vựng nào!');
                navigate(`/list/${listId}`);
                return;
            }
            rawData = data;
        }

        // Áp dụng sắp xếp/xáo trộn
        let sortedData = [...rawData];
        if (order === 'reverse') {
            sortedData.reverse();
        } else if (order === 'random') {
            for (let i = sortedData.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sortedData[i], sortedData[j]] = [sortedData[j], sortedData[i]];
            }
        }

        setVocabularies(sortedData);
        setCountdownValue(3);
        setStatus('countdown');
    };

    // Logic Đếm ngược 3-2-1
    useEffect(() => {
        if (status === 'countdown') {
            if (countdownValue > 0) {
                const timer = setTimeout(() => {
                    setCountdownValue(prev => prev - 1);
                }, 1000);
                return () => clearTimeout(timer);
            } else {
                setStatus('showing');
            }
        }
    }, [status, countdownValue]);

    // Tách riêng logic đếm ngược Trả lời tự động (Auto-answer)
    useEffect(() => {
        if (status === 'showing' && vocabularies.length > 0) {
            // Đảm bảo không vượt Out-of-bounds
            if (currentIndex >= vocabularies.length) return;

            const timer = setTimeout(() => {
                handleAnswer(false);
            }, timeLimit);

            return () => clearTimeout(timer);
        }
    }, [status, currentIndex, vocabularies.length, timeLimit]);

    // Lắng nghe phím Enter
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (status !== 'showing') return;
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAnswer(true);
        }
    }, [status, currentIndex, vocabularies.length]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const handleAnswer = (isRemembered: boolean) => {
        // Bảo vệ hàm nếu đã hoàn thành (index vượt mảng)
        if (currentIndex >= vocabularies.length || status === 'finished') return;

        const currentVocab = vocabularies[currentIndex];

        // Tránh nhấn đúp cùng một từ làm currentIndex bị tăng vọt 2 đơn vị
        if (resultsRef.current.some(r => r.vocab_id === currentVocab.id)) return;

        const newResult = { vocab_id: currentVocab.id, is_remembered: isRemembered };

        // Lưu đồng bộ bằng Ref để tránh closure trap
        resultsRef.current.push(newResult);
        setResults([...resultsRef.current]);

        // Cập nhật câu mới ngay lập tức không cần Timeout
        if (currentIndex < vocabularies.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Đây là câu cuối cùng -> Kết thúc ngay lập tức
            finishPractice([...resultsRef.current]);
        }
    };

    const finishPractice = async (finalResults: { vocab_id: string; is_remembered: boolean }[]) => {
        setStatus('finished');
        if (!session || !listId || isSaving.current || finalResults.length === 0) return;
        isSaving.current = true;

        try {
            // 1. Lưu Session
            const correctCount = finalResults.filter(r => r.is_remembered).length;
            const incorrectCount = finalResults.filter(r => !r.is_remembered).length;

            const { data: sessionData, error: sessionError } = await supabase
                .from('practice_sessions')
                .insert({
                    user_id: session.user.id,
                    list_id: listId,
                    total_words: finalResults.length,
                    correct_count: correctCount,
                    incorrect_count: incorrectCount
                })
                .select()
                .single();

            if (sessionError) throw sessionError;

            // 2. Lưu Details
            const detailsToInsert = finalResults.map(r => ({
                practice_session_id: sessionData.id,
                vocab_id: r.vocab_id,
                is_remembered: r.is_remembered
            }));
            await supabase.from('practice_details').insert(detailsToInsert);

            // 3. Lấy thông tin list hiện tại
            const { data: listData } = await supabase.from('lists').select('type, linked_review_list_id').eq('id', listId).single();

            // 4. Cập nhật last_5_results và logic Mastery
            for (const result of finalResults) {
                const vocab = vocabularies.find(v => v.id === result.vocab_id);
                if (vocab) {
                    const currentHistory = (vocab as any).last_5_results || [];
                    const newHistory = [...currentHistory, result.is_remembered].slice(-5);

                    // Cập nhật kết quả hiện tại
                    await supabase.from('vocabularies').update({ last_5_results: newHistory }).eq('id', vocab.id);

                    // Kiểm tra điều kiện Mastery (5 lần đúng liên tiếp)
                    const isMastered = newHistory.length === 5 && newHistory.every(h => h === true);

                    if (isMastered && listData?.type === 'review') {
                        // Nếu là từ trong list review và đã thuộc:
                        // - Cập nhật cho từ gốc (nếu có)
                        if ((vocab as any).parent_vocab_id) {
                            await supabase.from('vocabularies')
                                .update({ last_5_results: newHistory })
                                .eq('id', (vocab as any).parent_vocab_id);
                        }
                        // - Xóa từ khỏi list review
                        await supabase.from('vocabularies').delete().eq('id', vocab.id);
                    }
                }
            }

            // 5. Logic Copy Từ Chưa Nhớ Sang Review List
            const forgottenVocabIds = finalResults.filter(r => !r.is_remembered).map(r => r.vocab_id);
            if (forgottenVocabIds.length > 0) {
                // CHỈ copy dòng chưa nhớ sang Review List nến danh sách gốc là 'base' (tránh lặp vô tận danh sách review)
                if (listData?.linked_review_list_id && listData.type === 'base') {
                    // Kiểm tra xem những từ này đã tồn tại trong Review List chưa (dựa trên parent_vocab_id)
                    const { data: existingReviewItems } = await supabase
                        .from('vocabularies')
                        .select('parent_vocab_id')
                        .eq('list_id', listData.linked_review_list_id)
                        .in('parent_vocab_id', forgottenVocabIds);

                    const existingParentIds = new Set((existingReviewItems || []).map(item => item.parent_vocab_id));

                    const forgottenVocabs = vocabularies.filter(v => forgottenVocabIds.includes(v.id) && !existingParentIds.has(v.id));

                    if (forgottenVocabs.length > 0) {
                        const reviewItems = forgottenVocabs.map(v => ({
                            list_id: listData.linked_review_list_id,
                            content_type: v.content_type,
                            content: v.content,
                            parent_vocab_id: v.id // Lưu lại ID gốc để đồng bộ sau này
                        }));
                        await supabase.from('vocabularies').insert(reviewItems);
                    }
                }
            }
        } catch (err) {
            console.error('Lỗi khi lưu kết quả:', err);
        }
    };

    const handleExit = async () => {
        // Lưu tiến độ đến thời điểm hiện tại và đóng
        if (resultsRef.current.length > 0 && status === 'showing') {
            await finishPractice(resultsRef.current);
        }
        navigate(`/list/${listId}`);
    };

    const currentVocab = vocabularies[currentIndex];

    const handleRestart = () => {
        setCurrentIndex(0);
        setResults([]);
        resultsRef.current = [];
        isSaving.current = false;
        setStatus('loading');
        fetchVocabularies();
    };

    if (status === 'loading') return <div className="text-center" style={{ paddingTop: '50vh' }}>Đang nạp từ vựng...</div>;

    if (status === 'finished') {
        const correctCount = results.filter(r => r.is_remembered).length;
        return (
            <div className="container text-center mt-4">
                <h2>🎉 Buổi luyện tập kết thúc!</h2>
                <div className="card mt-4 mx-auto" style={{ maxWidth: 400 }}>
                    <p style={{ fontSize: '1.2rem' }}>Đúng: <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{correctCount}</span></p>
                    <p style={{ fontSize: '1.2rem' }}>Chưa nhớ: <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{results.length - correctCount}</span></p>

                    <button className="btn btn-primary mt-4 w-full" onClick={handleRestart}>Luyện tập lại</button>
                    <button className="btn mt-2 w-full" style={{ backgroundColor: 'var(--secondary)', color: 'var(--text-main)' }} onClick={() => navigate('/dashboard')}>Về Trang chủ</button>
                    <button className="btn mt-2 w-full" style={{ border: '1px solid var(--border-color)' }} onClick={() => navigate(`/list/${listId}`)}>Trở về danh sách</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'var(--bg-main)', zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
            {/* Nút thoát & Home */}
            <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: '10px' }}>
                <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1rem' }}
                    onClick={() => navigate('/dashboard')}
                    title="Về Trang chủ"
                >
                    <Home size={32} color="var(--text-muted)" />
                </button>
                <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1rem' }}
                    onClick={handleExit}
                    title="Dừng & Lưu lại lịch sử"
                >
                    <X size={32} color="var(--text-muted)" />
                </button>
            </div>

            {/* Tiến độ & Feedback */}
            {showFeedback && (
                <div style={{ position: 'absolute', top: 20, left: 20, fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                    {currentIndex + 1} / {vocabularies.length}
                </div>
            )}

            {/* Hiển thị Đếm ngược 3-2-1 */}
            {status === 'countdown' && (
                <div key={countdownValue} className="countdown-number">
                    {countdownValue}
                </div>
            )}

            {/* Hiển thị Flashcard */}
            {status === 'showing' && currentVocab && (
                <div style={{ animation: 'fadeIn 0.2s ease-in', textAlign: 'center' }}>
                    {currentVocab.content_type === 'text' && <h1 style={{ fontSize: '5rem', marginBottom: '2rem' }}>{currentVocab.content}</h1>}
                    {currentVocab.content_type === 'image' && <img src={currentVocab.content} alt="vocab" style={{ maxHeight: '60vh', maxWidth: '90vw', borderRadius: '12px', marginBottom: '2rem' }} />}
                    {currentVocab.content_type === 'audio' && (
                        <div className="text-center mb-4">
                            <audio src={currentVocab.content} autoPlay controls style={{ transform: 'scale(1.5)' }} />
                            <h2 className="mt-4 text-muted">Đang phát âm thanh...</h2>
                        </div>
                    )}

                    <button
                        className="btn btn-success"
                        style={{ padding: '1rem 3rem', fontSize: '1.5rem', borderRadius: '50px', boxShadow: 'var(--shadow-md)' }}
                        onClick={() => handleAnswer(true)}
                    >
                        Đã nhớ (Enter)
                    </button>
                </div>
            )}
        </div>
    );
}
