import { describe, it, expect } from "vitest";
import { personas, getPersonaById, getPersonasByLanguage } from "@/config/personas";

describe("personas config", () => {
  it("should have 11 personas total", () => {
    expect(personas).toHaveLength(12);
  });

  it("should have 8 Chinese personas", () => {
    const zh = personas.filter((p) => p.language === "zh");
    expect(zh).toHaveLength(8);
  });

  it("should have 2 English personas", () => {
    const en = personas.filter((p) => p.language === "en");
    expect(en).toHaveLength(2);
  });

  it("should have 2 mixed-language personas", () => {
    const mixed = personas.filter((p) => p.language === "mixed");
    expect(mixed).toHaveLength(2);
  });

  it("every persona should have required fields", () => {
    for (const p of personas) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.emoji).toBeTruthy();
      expect(["zh", "en", "mixed"]).toContain(p.language);
      expect(p.description).toBeTruthy();
      expect(p.tags.length).toBeGreaterThan(0);
      expect(p.lengthRange.min).toBeGreaterThan(0);
      expect(p.lengthRange.max).toBeGreaterThan(p.lengthRange.min);
      expect(p.systemPrompt).toBeTruthy();
    }
  });

  it("every persona id should be unique", () => {
    const ids = personas.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getPersonaById", () => {
  it("should return correct persona by id", () => {
    const p = getPersonaById("tieba_bro");
    expect(p).toBeDefined();
    expect(p!.name).toBe("贴吧老哥");
  });

  it("should return undefined for unknown id", () => {
    expect(getPersonaById("nonexistent")).toBeUndefined();
  });
});

describe("getPersonasByLanguage", () => {
  it("should return Chinese personas", () => {
    const zh = getPersonasByLanguage("zh");
    expect(zh.length).toBeGreaterThanOrEqual(7);
    zh.forEach((p) => {
      expect(["zh", "mixed"]).toContain(p.language);
    });
  });

  it("should return English personas", () => {
    const en = getPersonasByLanguage("en");
    expect(en.length).toBeGreaterThanOrEqual(2);
    en.forEach((p) => {
      expect(["en", "mixed"]).toContain(p.language);
    });
  });
});

describe("Persona type structure", () => {
  it("every persona should have tags array", () => {
    for (const p of personas) {
      expect(Array.isArray(p.tags)).toBe(true);
      expect(p.tags.length).toBeGreaterThan(0);
    }
  });

  it("every persona should have isBuiltIn boolean", () => {
    for (const p of personas) {
      expect(typeof p.isBuiltIn).toBe("boolean");
    }
  });

  it("language should be one of zh/en/mixed", () => {
    const valid = ["zh", "en", "mixed"];
    for (const p of personas) {
      expect(valid).toContain(p.language);
    }
  });

  it("should NOT have tone/avoid/catchphrases fields", () => {
    for (const p of personas) {
      expect((p as any).tone).toBeUndefined();
      expect((p as any).avoid).toBeUndefined();
      expect((p as any).catchphrases).toBeUndefined();
    }
  });
});
