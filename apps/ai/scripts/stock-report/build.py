# 종목 리포트의 HTML 틀(public/templates)과 예시(example.html, 사이트엔 그 그림)를 만든다. 둘은 같은 꼴이라 손으로 따로 고치지 말고 여기서 고친 뒤
#   python3 apps/ai/scripts/stock-report/build.py
# 로 다시 만들고, 예시 그림은
#   node apps/ai/scripts/stock-report/shot.mjs
# 로 다시 찍는다. 결과는 스크립트 없이 그려지는 정적 HTML 이다(스크립트를 막는 미리보기에서도 보이게). 예시 내용은 example.json.
import json, math, sys

CSS = """:root{--c:#e65817;--k:#1c1917;--l:#e7e5e4;--m:#78716c;--s:#f5f5f4;--g:#c9c5c2}
*{box-sizing:border-box;margin:0;padding:0}
html{background:#e7e5e4}
body{font-family:Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:var(--k);font-size:12.5px;line-height:1.65;word-break:keep-all}
.pg{max-width:800px;margin:16px auto;background:#fff;padding:44px 48px 28px}
.hd{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;border-bottom:2.5px solid var(--k);padding-bottom:9px}
.hd .l{font-size:13px;font-weight:600}.hd .l span{font-weight:400;color:var(--m);margin-left:8px}
.logo{font-size:17px;font-weight:800;letter-spacing:-.3px;white-space:nowrap}.logo:before{content:"";display:inline-block;width:11px;height:11px;background:var(--c);margin-right:5px}
h1{margin-top:24px;font-size:32px;font-weight:800;letter-spacing:-1px;line-height:1.2;border-left:5px solid var(--c);padding-left:12px}h1 small{font-size:17px;font-weight:500;margin-left:6px;white-space:nowrap}
.hl{font-size:21px;font-weight:700;margin:12px 0 22px;line-height:1.4}
.cols{display:grid;grid-template-columns:1fr 240px;grid-template-areas:"main top" "main rest";grid-template-rows:auto 1fr;gap:0 32px}
.main{grid-area:main}.top{grid-area:top}.rest{grid-area:rest}
.sum{background:var(--s);padding:15px 18px}.sum b{display:block;font-size:13.5px;margin-bottom:4px}
h3{font-size:14px;margin:20px 0 4px}
p{text-align:justify}
.tt{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-top:24px;border-bottom:1.5px solid var(--k);padding-bottom:5px}.tt b{font-size:13.5px}.tt span{font-size:10px;color:var(--m)}
table{width:100%;border-collapse:collapse}
.ft th{font-weight:600;text-align:left;padding:6px;border-bottom:1px solid var(--k)}.ft td{padding:5px 6px;border-bottom:1px solid var(--l)}.ft .n{text-align:right;white-space:nowrap}.ft td:last-child{color:var(--m)}
.src{font-size:10px;color:var(--m);margin-top:6px}
.rate{background:var(--k);color:#fff;text-align:center;font-size:30px;font-weight:800;padding:10px 0;letter-spacing:.5px}.rate small{font-size:13px;font-weight:400;margin-left:4px}
.kv td{padding:5px 0;border-bottom:1px solid var(--l)}.kv td+td{text-align:right}
.kv tr.big td{font-size:14px;font-weight:700;padding-top:10px}.kv tr.big td+td{color:var(--c)}
.note{font-size:10px;color:var(--m);margin-top:5px;line-height:1.5}
.rest h4{font-size:13px;margin-top:20px;border-bottom:1.5px solid var(--k);padding-bottom:5px}
.rt td{padding:5px 0;text-align:right;border-bottom:1px solid var(--l)}.rt td:first-child{text-align:left}
.up{color:var(--c)}
.bt{border-top:1px solid var(--g);padding-top:8px;margin-top:28px;display:flex;justify-content:space-between;gap:12px;font-size:10px;color:var(--m)}
h2{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:17px;margin-top:26px;border-bottom:1.5px solid var(--k);padding-bottom:6px}h2 span{font-size:10.5px;font-weight:400;color:var(--m)}
.rk td{padding:8px 12px;border-bottom:1px solid var(--l);vertical-align:top}.rk td:first-child{background:var(--s);font-weight:700;width:120px}.rk td:last-child{width:64px;text-align:center;font-weight:700;font-size:11px}
.rk .l1{background:var(--c);color:#fff}.rk .l2{background:#f08a55;color:#fff}.rk .l3{background:#fdece2;color:var(--c)}.rk .l4{background:var(--s);color:var(--m)}
.ch{position:relative;margin:18px 0 24px 40px}
.ch svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.ar{fill:var(--s)}.ln{fill:none;stroke:var(--k);stroke-width:1.8;vector-effect:non-scaling-stroke;stroke-linejoin:round}.ma{fill:none;stroke:var(--c);stroke-width:1.4;stroke-dasharray:4 3;vector-effect:non-scaling-stroke}
.gy{position:absolute;left:0;right:0;border-top:1px solid var(--l)}.gy span{position:absolute;right:100%;margin-right:6px;transform:translateY(-50%);font-size:9px;color:var(--m);white-space:nowrap}
.gx{position:absolute;top:100%;margin-top:4px;transform:translateX(-50%);font-size:9px;color:var(--m);white-space:nowrap}
.pt{font-style:normal;position:absolute;width:7px;height:7px;border-radius:50%;background:var(--k);transform:translate(-50%,-50%)}.pt.up{background:var(--c)}
.pt b{position:absolute;white-space:nowrap;font-size:10px}.pt.up b{bottom:8px;left:50%;transform:translateX(-50%);color:var(--c)}.pt.dn b{left:10px;top:50%;transform:translateY(-50%)}.pt.dn.l b{left:auto;right:10px}
.bars{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;position:relative;margin:18px 0 30px 40px}
.b{position:relative}.b em{position:absolute;bottom:0;left:20%;right:20%;background:var(--g)}.b.max em{background:var(--c)}.b.hi em{background:var(--k)}
.b i{position:absolute;left:0;right:0;text-align:center;font-size:9px;color:var(--m);font-style:normal;transform:translateY(-100%);margin-top:-3px}
.b span{position:absolute;top:100%;left:-4px;right:-4px;margin-top:5px;text-align:center;font-size:11px;font-weight:600;line-height:1.2;overflow-wrap:anywhere}
.op{display:grid;grid-template-columns:160px 1fr;border:1.5px solid var(--k);margin-top:12px}.op .r{background:var(--k);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:30px;font-weight:800;padding:12px}.op .r small{font-size:11px;font-weight:400;opacity:.7}.op div+div{padding:14px 18px;line-height:1.75}
@media (max-width:700px){
 .pg{margin:0 0 8px;padding:28px 18px 18px}
 h1{font-size:26px}.hl{font-size:18px}
 .cols{grid-template-columns:1fr;grid-template-areas:"top" "main" "rest"}.top{margin-bottom:22px}
 .rk td{padding:7px 8px}.rk td:first-child{width:84px}.rk td:last-child{width:46px}
 .b span{font-size:9.5px}
 .op{grid-template-columns:1fr}
}
@media print{html{background:#fff}.pg{margin:0 auto;break-after:page}}"""

def esc(s): return str(s).replace("&","&amp;").replace("<","&lt;")
def nice(mx):
    mx=max(mx,1); e=10**math.floor(math.log10(mx)-1)
    return next(f*e for f in [1,2,2.5,5,10,20,25,50,100] if math.ceil(mx/(f*e))<=4)
def f(v): return f"{v:,}"
def pc(x): return f"{x:.4g}"

def grid(top,st):
    return "".join(f'<div class="gy" style="top:{pc(100-v/top*100)}%"><span>{f(v)}</span></div>' for v in range(0,top+1,st))

def line(y,ticks,marks,h,ma=False,area=False):
    st=nice(max(y)); top=st*math.ceil(max(y)/st); n=len(y)
    X=lambda i:i/(n-1)*100; Y=lambda v:100-v/top*100
    pts=" ".join(f"{pc(X(i))},{pc(Y(v))}" for i,v in enumerate(y))
    svg=""
    if area: svg+=f'<polygon class="ar" points="0,100 {pts} 100,100"/>'
    if ma:
        m=[(i,sum(y[i-3:i+1])/4) for i in range(3,n)]
        svg+='<polyline class="ma" points="'+" ".join(f"{pc(X(i))},{pc(Y(v))}" for i,v in m)+'"/>'
    svg+=f'<polyline class="ln" points="{pts}"/>'
    o=f'<div class="ch" style="height:{h}px">{grid(top,st)}<svg viewBox="0 0 100 100" preserveAspectRatio="none">{svg}</svg>'
    for mk in marks:
        i,t,k=mk[:3]; side=" l" if len(mk)>3 else ""
        o+=f'<i class="pt {k}{side}" style="left:{pc(X(i))}%;top:{pc(Y(y[i]))}%"><b>{esc(t)}</b></i>'
    o+="".join(f'<span class="gx" style="left:{pc(X(i))}%">{esc(t)}</span>' for i,t in ticks)
    return o+"</div>"

def bars(d,hi,h):
    mx=max(v for _,v in d); st=nice(mx); top=st*math.ceil(mx/st)
    o=f'<div class="bars" style="height:{h}px">{grid(top,st)}'
    for t,v in d:
        cls=" max" if v==mx else " hi" if t==hi else ""
        hh=pc(v/top*100)
        o+=f'<div class="b{cls}"><em style="height:{hh}%"></em><i style="top:{pc(100-v/top*100)}%">{f(v)}</i><span>{esc(t)}</span></div>'
    return o+"</div>"

def kv(rows): return "".join(f"<tr><td>{esc(k)}</td><td>{esc(v)}</td></tr>" for k,v in rows)
def sign(v): return f'<span class="up">{esc(v)}</span>' if str(v).strip().startswith("+") else esc(v)
LV={"치명":"l1","높음":"l2","중간":"l3","관찰":"l4"}

def page(R, extra_head="", extra_body=""):
    logo=f'<div class="logo">{esc(R["broker"])}</div>'
    mon=R["monthly"]; peak=mon["y"].index(max(mon["y"]))
    mticks=[(i,x) for i,x in enumerate(mon["x"]) if i%3==0]
    secs="".join(f"<h3>{esc(t)}</h3><p>{esc(b)}</p>" for t,b in R["sections"])
    rows="".join(f'<tr><td>{esc(r[0])}</td><td class="n">{esc(r[1])}</td><td class="n">{esc(r[2])}</td><td>{esc(r[3])}</td></tr>' for r in R["forecast"]["rows"])
    w=R["weekly"]
    return f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{esc(R["name"])} Company Report</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
{CSS}{extra_head}
</style></head><body>
<div class="pg">
 <div class="hd"><div class="l">Company Report<span>{esc(R["date"])}</span></div>{logo}</div>
 <h1>{esc(R["name"])}<small>({esc(R["code"])})</small></h1>
 <div class="hl">{esc(R["headline"])}</div>
 <div class="cols">
  <div class="main">
   <div class="sum"><b>{esc(R["lead"])}</b><p>{esc(R["summary"])}</p></div>
   {secs}
   <div class="tt"><b>Forecasts and valuations</b><span>{esc(R["forecast"]["unit"])}</span></div>
   <table class="ft"><tr><th>지표</th><th class="n">누적 실적</th><th class="n">{esc(R["forecast"]["est"])}</th><th>코멘트</th></tr>{rows}</table>
   <div class="src">{esc(R["forecast"]["source"])}</div>
  </div>
  <div class="top">
   <div class="rate">{esc(R["rating"])}<small>{esc(R["ratingMark"])}</small></div>
   <table class="kv"><tr class="big"><td>목표주가</td><td>{esc(R["target"])} {esc(R["targetMark"])}</td></tr>{kv([["직전 목표주가",R["prevTarget"]],[f'현재주가 ({R["priceDate"]})',R["price"]]])}<tr><td>상승여력</td><td>{sign(R["upside"])}</td></tr></table>
   <div class="note">{esc(R["targetNote"])}</div>
  </div>
  <div class="rest">
   <h4>Stock Data</h4><table class="kv">{kv(R["stock"])}</table>
   <h4>주가수익률 (%)</h4><table class="rt"><tr><td></td>{"".join(f"<td>{esc(x)}</td>" for x in R["returns"]["head"])}</tr><tr><td>절대</td>{"".join(f"<td>{sign(x)}</td>" for x in R["returns"]["abs"])}</tr></table>
   <div class="note">{esc(R["returns"]["note"])}</div>
   <h4>Price Trend (월 거래량)</h4>{line(mon["y"],mticks,[(peak,f(max(mon["y"])),"up")],110)}
  </div>
 </div>
 <div class="bt"><span>{esc(R["broker"])} 리서치센터</span><span>양식: 개발자 성열 · @yeol.dev　　1</span></div>
</div>
<div class="pg">
 <div class="hd"><div class="l">{esc(R["name"])}<span>({esc(R["code"])})</span></div>{logo}</div>
 <h2>위험 요인<span>Risk Factors</span></h2>
 <table class="rk">{"".join(f'<tr><td>{esc(k)}</td><td>{esc(t)}</td><td class="{LV[l]}">{esc(l)}</td></tr>' for k,t,l in R["risks"])}</table>
 <h2>주가 추이<span>{esc(w["note"])}</span></h2>
 {line(w["y"],w["ticks"],w["marks"],210,ma=True,area=True)}
 <h2>말버릇별 거래량<span>{esc(R["words"]["note"])}</span></h2>
 {bars(R["words"]["data"],R["words"]["hi"],150)}
 <h2>투자의견<span>Recommendation</span></h2>
 <div class="op"><div class="r">{esc(R["rating"])}<small>{esc(R["ratingKo"])}</small></div><div><b>매수 근거.</b> {esc(R["opinion"]["buy"])}<br><b>매도 근거.</b> {esc(R["opinion"]["sell"])}<br><b>결론.</b> {esc(R["opinion"]["end"])}</div></div>
 <div class="bt"><span>본 조사분석자료는 대화 기록을 바탕으로 작성되었으며, 투자 결과에 대한 법적 책임 소재의 증빙자료로 사용될 수 없습니다.</span><span>2</span></div>
</div>{extra_body}
</body></html>
"""

def template():
    R={"broker":"{{가상의 증권사}}","date":"{{YYYY.MM.DD}}","name":"{{회사 이름}}","code":"{{6자리}}","headline":"{{리포트 제목}}",
    "lead":"{{요약 첫 줄}}","summary":"{{요약 3~4문장, 마지막은 투자의견}}",
    "sections":[["{{핵심 사업: 결론이 된 소제목}}","{{본문 3~5문장}}"]],
    "forecast":{"unit":"(단위: 회, {{YYYY}}E는 연환산)","est":"{{YYYY}}E","rows":[["{{지표}}","{{누적}}","{{예상}}","{{코멘트}}"]],"source":"자료: {{출처와 기간}}, {{가상의 증권사}} 리서치센터"},
    "rating":"{{HOLD}}","ratingMark":"(M)","ratingKo":"{{보유}}","target":"{{0원}}","targetMark":"(U)","prevTarget":"{{0원}}","price":"{{0원}}","priceDate":"{{MM/DD}}","upside":"+{{0.0}}%",
    "targetNote":"목표주가: {{계산식}}. 직전: {{계산식}}",
    "stock":[["{{시가총액}}","{{값}}"]],
    "returns":{"head":["1M","3M","{{n}}M"],"abs":["{{-0.0}}","{{-0.0}}","+{{0.0}}"],"note":"{{기준}}"},
    "monthly":{"x":["{{YY.MM}}","",""],"y":[100,300,200]},
    "risks":[["{{위험 이름}}","{{근거 숫자와 인용, 한 줄 결론}}","치명"]],
    "weekly":{"note":"주간 발화 건수, 점선은 4주 이동평균","y":[100,250,150,200,120],"ticks":[[0,"{{YY.MM}}"]],"marks":[[1,"{{사건}}","up"],[4,"{{-00%}}","dn"]]},
    "words":{"note":"Top 10, 누적 발화","hi":"{{대표 말버릇}}","data":[["{{가장 많은 말}}",300],["{{대표 말버릇}}",200],["{{말버릇}}",100]]},
    "opinion":{"buy":"{{한 문장}}","sell":"{{한 문장}}","end":"{{한 문장}}"}}
    s=page(R)
    CH="""<!-- 꺾은선 그리는 법
 1. 축 최댓값 M = 데이터 최댓값보다 조금 큰 깔끔한 수(예: 최댓값 2,447 이면 3,000). 눈금선 .gy 는 0부터 M 까지 3~5개, top = 100 - 값÷M×100 (%)
 2. 점 n개 중 i번째(0부터): x = i÷(n-1)×100, y = 100 - 값÷M×100. polyline 의 points 에 "x,y" 를 공백으로 이어 쓴다(소수 한두 자리면 충분)
 3. .ar(회색 면) points = "0,100 " + 같은 점들 + " 100,100". .ma(주황 점선) = 4주 이동평균 점들. 계산이 어려우면 .ma 줄을 지운다
 4. 표시점 .pt: left = x%, top = y%. "pt up" 은 주황(라벨이 위), "pt dn" 은 검정(라벨이 오른쪽, 오른쪽 끝이면 "pt dn l")
 5. 아래 눈금 .gx: left = x% -->"""
    rep=[
    ('<!doctype html>\n','<!doctype html>\n<!-- {{…}} 를 모두 내 내용으로 채운다. <style> 과 태그 구조·class 는 그대로 둔다. 같은 줄을 늘릴 땐 주석의 개수를 따른다 -->\n'),
    ('<b>{{요약 첫 줄}}</b>','<b>{{요약 첫 줄: 숫자 두 개 + 한 줄 결론}}</b>'),
    ('<p>{{본문 3~5문장}}</p>','<p>{{본문 3~5문장. 숫자와 실제 인용}}</p>\n   <!-- h3+p 묶음을 3개(핵심 사업, 경쟁력, 하나 더) -->'),
    ('<td>{{코멘트}}</td></tr></table>','<td>{{코멘트}}</td></tr>\n   <!-- tr 을 5~6줄. 지표는 말버릇·습관, 코멘트는 한 줄 드립 --></table>'),
    ('<div class="rate">{{HOLD}}','<!-- 투자의견: BUY·HOLD·SELL 중 하나. (U) 상향 (D) 하향 (M) 유지 -->\n   <div class="rate">{{HOLD}}'),
    ('<span class="up">+{{0.0}}%</span>','<span class="up">+{{0.0}}%</span><!-- 오름(+)만 span class="up" 로 감싼다 -->'),
    ('<tr><td>{{시가총액}}</td><td>{{값}}</td></tr></table>','<tr><td>{{시가총액}}</td><td>{{값}}</td></tr>\n   <!-- tr 을 7~9줄: 시가총액, 상장일(첫 대화), 발행주식수(보낸 메시지), 일평균 거래량, 52주 최고(가장 많이 보낸 날) 등 --></table>'),
    ('<h4>Price Trend (월 거래량)</h4>','<h4>Price Trend (월 거래량)</h4>\n   <!-- 월별 메시지 수 꺾은선. 그리는 법은 2쪽 "주가 추이" 주석과 같다. 표시점은 최댓값 하나 -->\n   '),
    ('<td class="l1">치명</td></tr></table>','<td class="l1">치명</td></tr>\n <!-- tr 을 4~5줄. 등급 칸 class: l1 치명, l2 높음, l3 중간, l4 관찰 --></table>'),
    ('<h2>주가 추이','<!-- 주간 메시지 수 -->\n <h2>주가 추이'),
    ('<h2>말버릇별 거래량','<!-- 막대 그리는 법: 말버릇 상위 10개. 축 최댓값 M 은 꺾은선과 같은 방식. em 의 height = 값÷M×100 %, i 의 top = 100 - 그 값 %. 가장 큰 막대는 "b max"(주황), 이 사람을 대표하는 말 하나는 "b hi"(검정), 나머지는 "b". 막대 이름은 6자 안팎으로 짧게 -->\n <h2>말버릇별 거래량'),
    ]
    for a,b in rep:
        assert s.count(a)==1,a; s=s.replace(a,b)
    i=s.index('<div class="ch" style="height:210px">'); s=s[:i]+CH+"\n "+s[i:]
    return s

if __name__=="__main__":
    import os
    here=os.path.dirname(os.path.abspath(__file__)); pub=os.path.join(here,"..","..","public")
    R=json.load(open(os.path.join(here,"example.json")))
    # 예시는 HTML 로 만들어 두고, 사이트엔 shot.mjs 로 찍은 그림(public/examples/stock-report-*.webp)을 올린다
    open(os.path.join(here,"example.html"),"w").write(page(R))
    open(os.path.join(pub,"templates","stock-report.html"),"w").write(template())
