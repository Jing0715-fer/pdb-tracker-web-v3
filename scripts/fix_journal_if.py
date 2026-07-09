#!/usr/bin/env python3
"""
修复因 IF 错配产生的 journalIf 脏数据。

Bug 历史：
- Protein Cell (真实 IF=21.1) 被错配成 Cell (66.9)
- Mol.Cell / Mol Cells 被错配成 Cell (66.9)

修复策略：
1. 对所有 (journal, journalIf) 记录，重新跑 fix_w22_w23.py 的规范化匹配逻辑
2. 如果新算出的 IF != 现有 journalIf → 修正
3. 同时把 pdb_structures 表里 journal 为 'Protein Cell' 但 journal_if=66.9 的纠正
"""
import sqlite3
import re
import sys
from collections import Counter
from pathlib import Path

# ============== IF 字典 ==============
JOURNAL_IF = {
    'Nature': 64.8,
    'Nat Commun': 17.7,
    'Science': 56.9,
    'Cell': 66.9,
    'Mol Cell': 19.3,
    'Mol.Cell': 19.3,           # 同一本期刊的不同写法
    'Protein Cell': 21.1,
    'Proc.Natl.Acad.Sci.USA': 11.1,
    'Nat Struct Mol Biol': 16.1,
    'Nucleic Acids Res.': 19.2,
    'J.Am.Chem.Soc.': 15.0,
    'Angew.Chem.Int.Ed.Engl.': 16.6,
    'J.Med.Chem.': 7.3,
    'Embo J.': 8.3,
    'Structure': 4.4,
    'Sci Rep': 4.6,
    'J.Biol.Chem.': 4.5,
    'Biochemistry': 3.1,
    'Biochem.J.': 3.7,
    'J.Struct.Biol.': 3.0,
    'Int.J.Biol.Macromol.': 8.2,
    'Commun Biol': 5.1,
    'Viruses': 4.7,
    'Br.J.Pharmacol.': 7.3,
    'Febs J.': 5.5,
    'Protein Sci.': 8.0,
    'Acs Chem.Biol.': 5.5,
    'Cell Res.': 44.1,
    'Cell Discov': 12.0,
    'Cell Host Microbe': 30.3,
    'Cell Rep': 7.5,
    'Mol Cells': 5.0,
    'J.Mol.Biol.': 5.6,
    'Commun Chem': 5.9,
    'Plant Commun.': 10.5,
    'Acs Catalysis': 13.1,
    'Biorxiv': 0.0,
    'bioRxiv': 0.0,
    'Acta Crystallogr D Struct Biol': 2.1,
    'Sci Adv': 14.1,
    'Rsc Adv': 3.9,
    'Mol Ther Adv': 0.0,
}

# 标点规范化后比较
def _norm(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', s.lower())

# 按规范化后 key 长度倒序
NORM_KEYS = sorted(
    [(_norm(k), v) for k, v in JOURNAL_IF.items()],
    key=lambda x: len(x[0]),
    reverse=True
)

def resolve_if(journal: str):
    """返回正确的 IF (None = 没匹配上，保留原值)"""
    if not journal:
        return None
    j_norm = _norm(journal)
    for k_norm, k_if in NORM_KEYS:
        if k_norm == j_norm:
            return k_if
    return None  # 未识别期刊，保留为 0 或 NULL

# ============== 主流程 ==============
def fix_db(db_path: Path, table: str, id_col: str, journal_col: str, if_col: str):
    print(f"\n=== 修复 {db_path} 表 {table} ===")
    conn = sqlite3.connect(db_path)
    # 先扫一遍
    rows = conn.execute(f"SELECT {id_col}, {journal_col}, {if_col} FROM {table}").fetchall()
    print(f"  总行数: {len(rows)}")

    fixes = []
    unresolved = []
    for row_id, journal, current_if in rows:
        if not journal:
            continue
        new_if = resolve_if(journal)
        if new_if is None:
            # 未识别期刊：如果当前 IF 是非零可疑值（可能错配），标出
            if current_if and current_if > 30:
                unresolved.append((row_id, journal, current_if))
            continue
        if abs((current_if or 0) - new_if) > 0.01:
            fixes.append((row_id, journal, current_if, new_if))

    print(f"  需要修正: {len(fixes)}")
    print(f"  高IF但未匹配: {len(unresolved)}")

    # 修正
    for row_id, journal, old_if, new_if in fixes:
        conn.execute(f"UPDATE {table} SET {if_col} = ? WHERE {id_col} = ?", (new_if, row_id))
    conn.commit()

    # 报告
    if fixes:
        print("  修正样本:")
        for row_id, journal, old_if, new_if in fixes[:10]:
            print(f"    [{row_id}] {journal!r:30}  {old_if} → {new_if}")
        if len(fixes) > 10:
            print(f"    ... 还有 {len(fixes) - 10} 条")
    if unresolved:
        print("  ⚠️ 未知期刊但 IF > 30（人工核对）:")
        for row_id, journal, old_if in unresolved[:10]:
            print(f"    [{row_id}] {journal!r:30}  {old_if}")

    # 按 journal 聚合
    journal_changes = Counter()
    for _, j, old, new in fixes:
        journal_changes[j] += 1
    if journal_changes:
        print("  按期刊统计修复:")
        for j, n in sorted(journal_changes.items(), key=lambda x: -x[1]):
            print(f"    {j!r:30}  {n} 条")
    conn.close()
    return len(fixes)

def main():
    print("🚀 修复 journalIf 错配数据")
    print(f"   字典大小: {len(JOURNAL_IF)} 期刊")
    print(f"   规范化 key 数: {len(NORM_KEYS)}")

    # 1. 修复 Wiki DB (PDB web UI 用)
    wiki_db = Path("/Users/lijing/Documents/my_note/LLM-Wiki/data/pdb_tracker.db")
    n1 = fix_db(wiki_db, "PdbStructure", "pdbId", "journal", "journalIf")

    # 2. 修复默认 DB
    default_db = Path("/Users/lijing/.pdb-tracker/data/pdb_tracker.db")
    n2 = fix_db(default_db, "pdb_structures", "pdb_id", "journal", "journal_if")

    print(f"\n🎉 修复完成: Wiki DB {n1} 条, 默认 DB {n2} 条")

if __name__ == "__main__":
    main()
