# 원천 데이터를 TSV 로 덤프: 영어 빈도순 단어+발음, 한자 병음, 한자 한국음
import re, cmudict
from wordfreq import top_n_list
from pypinyin import pinyin, Style
from hanja import table

cmu = cmudict.dict()
seen = set()
with open("data/en.tsv", "w") as f:
    for w in top_n_list("en", 120000):
        w = w.replace("’", "'")
        if not re.fullmatch(r"[a-z]+(?:'[a-z]+)?", w) or w in seen or w not in cmu:
            continue
        seen.add(w)
        f.write(w + "\t" + " ".join(cmu[w][0]) + "\n")
        if len(seen) >= 60000:
            break
print("en", len(seen))

hj = table.hanja_table
with open("data/han.tsv", "w") as f:
    for cp in range(0x4E00, 0xA000):
        ch = chr(cp)
        py = pinyin(ch, style=Style.NORMAL, heteronym=False, errors="ignore")
        p = py[0][0] if py and py[0] else ""
        if p == ch: p = ""
        f.write(f"{cp:x}\t{p}\t{hj.get(ch, '')}\n")
print("han done")
