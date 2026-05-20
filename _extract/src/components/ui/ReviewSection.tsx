"use client";

import { useState } from "react";
import { Star, ThumbsUp, MessageSquare, User } from "lucide-react";
import toast from "react-hot-toast";

// Mockup Data
const MOCK_REVIEWS = [
  {
    id: 1,
    userName: "Nguyễn Văn A",
    rating: 5,
    date: "20/04/2026",
    content: "Sản phẩm chất lượng rất tốt, đóng gói cẩn thận. Giao hàng nhanh hơn dự kiến. Sẽ tiếp tục ủng hộ shop!",
    likes: 12,
  },
  {
    id: 2,
    userName: "Trần Thị B",
    rating: 4,
    date: "15/04/2026",
    content: "Hàng đúng như mô tả, tuy nhiên hộp hơi móp một chút do vận chuyển. Nhìn chung là đáng tiền.",
    likes: 5,
  },
  {
    id: 3,
    userName: "Lê C",
    rating: 5,
    date: "10/04/2026",
    content: "Tuyệt vời! Sản phẩm hoạt động rất mượt mà. Dịch vụ CSKH cũng rất nhiệt tình giải đáp thắc mắc.",
    likes: 24,
  }
];

export default function ReviewSection() {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) {
      toast.error("Vui lòng nhập nội dung đánh giá!");
      return;
    }
    
    setIsSubmitting(true);
    // Giả lập API call
    setTimeout(() => {
      toast.success("Cảm ơn bạn đã đánh giá sản phẩm!");
      setReviewText("");
      setRating(5);
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="mt-16 border-t border-gray-100 pt-12">
      <div className="flex flex-col md:flex-row gap-12">
        {/* Rating Overview */}
        <div className="w-full md:w-1/3 shrink-0">
          <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-500" />
            Đánh Giá Sản Phẩm
          </h3>
          
          <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100/50 flex flex-col items-center justify-center text-center">
            <div className="text-5xl font-black text-blue-600 mb-2">4.8</div>
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`w-6 h-6 ${star <= 4 ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
              ))}
            </div>
            <p className="text-sm text-gray-500 font-medium">{MOCK_REVIEWS.length} bài đánh giá</p>
          </div>

          <div className="mt-8 space-y-3">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12 shrink-0">
                  <span className="text-sm font-bold text-gray-700">{star}</span>
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 rounded-full" 
                    style={{ width: star === 5 ? '80%' : star === 4 ? '15%' : '0%' }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-gray-400 w-8 text-right">
                  {star === 5 ? '80%' : star === 4 ? '15%' : '0%'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews List & Form */}
        <div className="flex-1">
          {/* Form Write Review */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] mb-10">
            <h4 className="font-bold text-gray-900 mb-4">Viết đánh giá của bạn</h4>
            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-500 font-medium mr-2">Chất lượng:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star className={`w-7 h-7 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none mb-4"
              ></textarea>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </div>
            </form>
          </div>

          {/* Review List */}
          <div className="space-y-6">
            {MOCK_REVIEWS.map((review) => (
              <div key={review.id} className="pb-6 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 leading-none mb-1">{review.userName}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`w-3.5 h-3.5 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
                          ))}
                        </div>
                        <span className="text-xs text-gray-400 font-medium">• {review.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 mb-3 leading-relaxed text-sm md:text-base">{review.content}</p>
                <button className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors">
                  <ThumbsUp className="w-4 h-4" /> Hữu ích ({review.likes})
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
