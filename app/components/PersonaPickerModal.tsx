"use client";

import { useState } from "react";
import { personas } from "@/config/personas";

const FILTER_TAGS = ["全部", "搞笑", "犀利", "专业", "温暖", "英文"];

interface PersonaPickerModalProps {
  open: boolean;
  currentPersonaId: string;
  onSelect: (personaId: string) => void;
  onClose: () => void;
}

export default function PersonaPickerModal({
  open,
  currentPersonaId,
  onSelect,
  onClose,
}: PersonaPickerModalProps) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("全部");

  if (!open) return null;

  const keyword = search.trim().toLowerCase();

  const filtered = personas.filter((p) => {
    const matchesTag =
      activeTag === "全部" || p.tags.includes(activeTag);

    const matchesSearch =
      !keyword ||
      p.name.toLowerCase().includes(keyword) ||
      p.description.toLowerCase().includes(keyword) ||
      p.tags.some((t) => t.toLowerCase().includes(keyword));

    return matchesTag && matchesSearch;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">选择评论人格</div>
            <div className="modal-subtitle">找一个适合这条内容的评论风格</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="modal-search-wrap">
          <input
            className="modal-search"
            type="text"
            placeholder="搜索人格、标签、描述..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Tag filters */}
        <div className="modal-tags">
          {FILTER_TAGS.map((tag) => (
            <button
              key={tag}
              className={`modal-tag${activeTag === tag ? " active" : ""}`}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Persona grid */}
        <div className="modal-grid">
          {filtered.length === 0 ? (
            <div className="modal-empty">没有找到匹配的人格</div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                className={`modal-persona-card${currentPersonaId === p.id ? " active" : ""}`}
                onClick={() => {
                  onSelect(p.id);
                  onClose();
                }}
              >
                <div className="modal-persona-emoji">{p.emoji}</div>
                <div className="modal-persona-info">
                  <div className="modal-persona-name">{p.name}</div>
                  <div className="modal-persona-desc">{p.description}</div>
                </div>
                {currentPersonaId === p.id && (
                  <div className="modal-persona-check">✓</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
