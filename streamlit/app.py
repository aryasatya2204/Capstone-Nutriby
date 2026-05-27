import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# ─────────────────────────────────────────────
# PAGE CONFIG
# ─────────────────────────────────────────────
st.set_page_config(
    page_title="Dashboard EDA MPASI",
    page_icon="🥣",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ─────────────────────────────────────────────
# CUSTOM CSS
# ─────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono&display=swap');

html, body, [class*="css"] {
    font-family: 'Plus Jakarta Sans', sans-serif;
}

/* Sidebar */
[data-testid="stSidebar"] {
    background: linear-gradient(160deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
    color: white;
}
[data-testid="stSidebar"] * {
    color: white !important;
}
[data-testid="stSidebar"] .stRadio label {
    font-size: 0.95rem;
    padding: 4px 0;
}

/* Main background */
.main {
    background-color: #f8fafc;
}

/* Metric cards */
.metric-card {
    background: white;
    border-radius: 16px;
    padding: 20px 24px;
    border-left: 5px solid;
    box-shadow: 0 2px 12px rgba(0,0,0,0.07);
    height: 100%;
}
.metric-card.blue  { border-color: #3b82f6; }
.metric-card.green { border-color: #22c55e; }
.metric-card.amber { border-color: #f59e0b; }
.metric-card.rose  { border-color: #f43f5e; }
.metric-card.purple{ border-color: #a855f7; }
.metric-card.teal  { border-color: #14b8a6; }

.metric-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 6px; }
.metric-value { font-size: 2rem; font-weight: 800; color: #111827; line-height: 1.1; }
.metric-sub   { font-size: 0.8rem; color: #9ca3af; margin-top: 4px; }

/* Section headers */
.section-title {
    font-size: 1.3rem;
    font-weight: 700;
    color: #1e293b;
    margin: 8px 0 2px;
    padding-bottom: 6px;
    border-bottom: 3px solid #e2e8f0;
}
.section-desc {
    font-size: 0.85rem;
    color: #64748b;
    margin-bottom: 16px;
}

/* Insight box */
.insight-box {
    background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
    border: 1px solid #bfdbfe;
    border-radius: 12px;
    padding: 16px 20px;
    margin-top: 12px;
    font-size: 0.88rem;
    color: #1e3a5f;
    line-height: 1.7;
}
.insight-box strong { color: #1d4ed8; }

/* Page title */
.page-header {
    background: linear-gradient(135deg, #1e3a5f 0%, #1e5f74 100%);
    border-radius: 16px;
    padding: 28px 32px;
    color: white;
    margin-bottom: 24px;
}
.page-header h1 { font-size: 1.9rem; font-weight: 800; margin: 0; }
.page-header p  { margin: 6px 0 0; color: #93c5fd; font-size: 0.95rem; }

/* Warning badge */
.badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    margin-left: 8px;
}
.badge-red   { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
.badge-green { background: #f0fdf4; color: #22c55e; border: 1px solid #bbf7d0; }
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────
# DATA LOADING
# ─────────────────────────────────────────────
@st.cache_data
def load_data():
    df_profile = pd.read_excel("dataset_profile_final.xlsx")
    df_zscore  = pd.read_excel("Zscore.xlsx")

    df1 = pd.read_excel("Dataset_Labeling_Part_1.xlsx")
    df2 = pd.read_excel("Dataset_Labeling_Part_2.xlsx")
    df3 = pd.read_excel("Dataset_Labeling_Part_3.xlsx")
    df_lab = pd.concat([df1, df2, df3], ignore_index=True)
    df_lab.columns = df_lab.columns.str.strip()

    for col in ['label_skor_kecocokan', 'label_budget', 'budget_real']:
        df_lab[col] = pd.to_numeric(
            df_lab[col].astype(str).str.replace(',', '.').str.replace(' ', ''),
            errors='coerce'
        )
    df_lab = df_lab.drop_duplicates()

    # Classify status gizi
    def classify_gizi(z):
        if z < -3:  return 'Gizi Buruk'
        elif z < -2: return 'Gizi Kurang'
        elif z <= 2: return 'Gizi Normal'
        else:        return 'Gizi Lebih'

    df_profile['status_gizi'] = df_profile['z_terburuk'].apply(classify_gizi)

    # Klasifikasi per indikator (tambahan)
    df_profile['status_stunting'] = df_profile['zscore_hfa'].apply(classify_gizi)  # Tinggi/Umur
    df_profile['status_gizi_wfa'] = df_profile['zscore_wfa'].apply(classify_gizi)  # Berat/Umur
    df_profile['status_wasting']  = df_profile['zscore_wfh'].apply(classify_gizi)  # Berat/Tinggi

    # Age group
    df_profile['kelompok_umur'] = pd.cut(
        df_profile['umur_bulan'],
        bins=[5,9,12,18,24],
        labels=['6-9 bln','10-12 bln','13-18 bln','19-24 bln']
    )

    # Binary label for labeling dataset
    df_lab['binary_label'] = (df_lab['label_skor_kecocokan'] > 0.5).astype(int)

    # Kategori harga
    df_lab['kategori_harga'] = pd.cut(
        df_lab['budget_real'],
        bins=[0, 5000, 10000, 15000, 20000, 50000],
        labels=['< 5k','5k–10k','10k–15k','15k–20k','> 20k']
    )

    return df_profile, df_zscore, df_lab

df_profile, df_zscore, df_lab = load_data()

# ─────────────────────────────────────────────
# SIDEBAR
# ─────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🥣 MPASI Dashboard")
    st.markdown("**Capstone Project — EDA**")
    st.markdown("---")
    page = st.radio(
        "Navigasi Halaman",
        [
            "🏠 Ringkasan",
            "📊 EDA Profil Anak",
            "🧪 EDA Data Labelling",
            "💡 Kesimpulan",
        ]
    )
    st.markdown("---")
    st.markdown("**Dataset Info**")
    st.markdown(f"👶 Profil anak: **{len(df_profile):,}**")
    st.markdown(f"🍽️ Pasangan menu: **{len(df_lab):,}**")
    st.markdown(f"📝 Unique recipe: **{df_lab['recipe_id'].nunique()}**")


# ═══════════════════════════════════════════════
# PAGE 1: RINGKASAN
# ═══════════════════════════════════════════════
if page == "🏠 Ringkasan":
    st.markdown("""
    <div class="page-header">
        <h1>🥣 Dashboard EDA — Sistem Rekomendasi MPASI</h1>
        <p>Exploratory Data Analysis pada data profil anak & data labelling menu MPASI berdasarkan standar WHO</p>
    </div>
    """, unsafe_allow_html=True)

    # Key metrics
    gizi_normal_pct = (df_profile['status_gizi'] == 'Gizi Normal').mean() * 100
    gizi_kurang_pct = (df_profile['status_gizi'].isin(['Gizi Kurang','Gizi Buruk'])).mean() * 100
    relevan_pct     = (df_lab['label_skor_kecocokan'] > 0.5).mean() * 100
    budget_fit_pct  = (df_lab['label_budget'] == 1).mean() * 100

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f"""<div class="metric-card blue">
            <div class="metric-label">Total Data Anak</div>
            <div class="metric-value">{len(df_profile):,}</div>
            <div class="metric-sub">Usia 6–24 bulan</div>
        </div>""", unsafe_allow_html=True)
    with c2:
        st.markdown(f"""<div class="metric-card rose">
            <div class="metric-label">Gizi Kurang + Buruk</div>
            <div class="metric-value">{gizi_kurang_pct:.1f}%</div>
            <div class="metric-sub">Perlu perhatian khusus</div>
        </div>""", unsafe_allow_html=True)
    with c3:
        st.markdown(f"""<div class="metric-card green">
            <div class="metric-label">Gizi Normal</div>
            <div class="metric-value">{gizi_normal_pct:.1f}%</div>
            <div class="metric-sub">Z-score dalam range</div>
        </div>""", unsafe_allow_html=True)
    with c4:
        st.markdown(f"""<div class="metric-card purple">
            <div class="metric-label">Menu Relevan (>0.5)</div>
            <div class="metric-value">{relevan_pct:.1f}%</div>
            <div class="metric-sub">Dari 2.5 juta pasangan</div>
        </div>""", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    col_l, col_r = st.columns([1.2, 1])

    with col_l:
        st.markdown('<div class="section-title">Distribusi Status Gizi</div>', unsafe_allow_html=True)
        gizi_counts = df_profile['status_gizi'].value_counts().reset_index()
        gizi_counts.columns = ['Status', 'Jumlah']
        color_map = {
            'Gizi Normal': '#22c55e',
            'Gizi Kurang': '#f59e0b',
            'Gizi Buruk':  '#ef4444',
            'Gizi Lebih':  '#a855f7'
        }
        fig = px.bar(
            gizi_counts, x='Status', y='Jumlah', color='Status',
            color_discrete_map=color_map,
            text='Jumlah'
        )
        fig.update_layout(
            showlegend=False,
            plot_bgcolor='white', paper_bgcolor='white',
            margin=dict(t=10, b=10),
            yaxis=dict(gridcolor='#f1f5f9'),
            font=dict(family='Plus Jakarta Sans')
        )
        fig.update_traces(textposition='outside', textfont_size=12)
        st.plotly_chart(fig, use_container_width=True)

    with col_r:
        st.markdown('<div class="section-title">Distribusi Jenis Kelamin</div>', unsafe_allow_html=True)
        jk = df_profile['jenis_kelamin'].value_counts()
        fig2 = go.Figure(go.Pie(
            labels=['Laki-laki (L)', 'Perempuan (P)'],
            values=[jk.get('L', 0), jk.get('P', 0)],
            hole=0.55,
            marker_colors=['#3b82f6', '#f43f5e'],
            textinfo='label+percent',
            textfont_size=13
        ))
        fig2.update_layout(
            showlegend=False,
            margin=dict(t=10, b=10),
            paper_bgcolor='white',
            font=dict(family='Plus Jakarta Sans')
        )
        st.plotly_chart(fig2, use_container_width=True)

    st.markdown("""
    <div class="insight-box">
    📌 <strong>Ringkasan Temuan:</strong> Dataset terdiri dari 10.000 profil anak usia 6–24 bulan dengan distribusi jenis kelamin yang hampir seimbang.
    Status gizi didominasi oleh kondisi <strong>Gizi Buruk & Gizi Kurang (~66%)</strong>, yang mengindikasikan tingginya kebutuhan sistem rekomendasi MPASI yang tepat sasaran.
    Dari 2,5 juta pasangan menu-pengguna, hanya <strong>~34,5% dianggap relevan</strong>, menunjukkan tantangan matching yang signifikan.
    </div>
    """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════
# PAGE 2: EDA PROFIL ANAK
# ═══════════════════════════════════════════════
elif page == "📊 EDA Profil Anak":
    st.markdown("""
    <div class="page-header">
        <h1>📊 EDA Profil Anak</h1>
        <p>Analisis distribusi z-score WHO, nutrisi, umur, dan preferensi makanan</p>
    </div>
    """, unsafe_allow_html=True)

    tab1, tab2, tab3, tab4 = st.tabs(["📐 Z-Score WHO", "🍽️ Target Nutrisi", "👶 Umur & Gender", "🥜 Alergi & Preferensi"])

    # ── TAB 1: Z-SCORE ──
    with tab1:
        st.markdown('<div class="section-title">Distribusi Z-Score (HFA, WFA, WFH)</div>', unsafe_allow_html=True)
        st.markdown('<div class="section-desc">Garis merah = -2 SD (batas bawah normal), Garis hijau = +2 SD (batas atas normal)</div>', unsafe_allow_html=True)

        fig = make_subplots(rows=1, cols=3, subplot_titles=['Z-score HFA<br>(Tinggi/Umur)', 'Z-score WFA<br>(Berat/Umur)', 'Z-score WFH<br>(Berat/Tinggi)'])
        zscore_cols = [('zscore_hfa', 1), ('zscore_wfa', 2), ('zscore_wfh', 3)]
        colors = ['#3b82f6', '#22c55e', '#f59e0b']

        for (col, idx), color in zip(zscore_cols, colors):
            vals = df_profile[col].dropna()
            fig.add_trace(go.Histogram(x=vals, nbinsx=30, marker_color=color, opacity=0.75, name=col), row=1, col=idx)
            for xv, lc in [(-2, 'red'), (2, '#16a34a')]:
                fig.add_vline(x=xv, line_dash='dash', line_color=lc, row=1, col=idx)

        fig.update_layout(showlegend=False, plot_bgcolor='white', paper_bgcolor='white',
                          height=350, margin=dict(t=50, b=10),
                          font=dict(family='Plus Jakarta Sans'))
        fig.update_yaxes(gridcolor='#f1f5f9')
        st.plotly_chart(fig, use_container_width=True)

        # Boxplot
        st.markdown('<div class="section-title">Boxplot Z-Score</div>', unsafe_allow_html=True)
        fig2 = go.Figure()
        for col, color, name in [('zscore_hfa','#3b82f6','HFA'), ('zscore_wfa','#22c55e','WFA'), ('zscore_wfh','#f59e0b','WFH')]:
            fig2.add_trace(go.Box(x=df_profile[col], name=name, marker_color=color, boxmean=True))
        fig2.add_vline(x=-2, line_dash='dash', line_color='red', annotation_text='-2 SD')
        fig2.add_vline(x=2,  line_dash='dash', line_color='green', annotation_text='+2 SD')
        fig2.update_layout(plot_bgcolor='white', paper_bgcolor='white',
                           height=250, margin=dict(t=10, b=10),
                           font=dict(family='Plus Jakarta Sans'))
        st.plotly_chart(fig2, use_container_width=True)

        st.markdown("""
        <div class="insight-box">
        📌 <strong>Insight Z-Score:</strong>
        Distribusi z-score HFA dan WFA keduanya <strong>bergeser ke kiri (negatif)</strong>, menunjukkan bahwa mayoritas anak dalam dataset mengalami stunting maupun underweight.
        Z-score WFH sedikit lebih tersebar, namun puncak distribusi tetap berada di bawah 0.
        Terdapat nilai ekstrem di bawah -3 yang mengindikasikan kondisi gizi buruk berat pada sejumlah anak.
        </div>
        """, unsafe_allow_html=True)

    # ── TAB 2: NUTRISI ──
    with tab2:
        st.markdown('<div class="section-title">Target Nutrisi Harian per Status Gizi</div>', unsafe_allow_html=True)
        nutri_cols = {
            'target_kalori_kkal': ('Kalori (kkal)', '#3b82f6'),
            'target_protein_g':   ('Protein (g)',   '#22c55e'),
            'target_lemak_g':     ('Lemak (g)',     '#f59e0b'),
            'target_besi_mg':     ('Besi (mg)',     '#f43f5e'),
            'target_zinc_mg':     ('Zinc (mg)',     '#a855f7'),
        }

        sel_nutri = st.selectbox("Pilih Nutrisi", list(nutri_cols.keys()),
                                 format_func=lambda x: nutri_cols[x][0])
        label, color = nutri_cols[sel_nutri]

        fig = px.box(
            df_profile, x='status_gizi', y=sel_nutri,
            color='status_gizi',
            color_discrete_map={
                'Gizi Normal': '#22c55e', 'Gizi Kurang': '#f59e0b',
                'Gizi Buruk': '#ef4444', 'Gizi Lebih': '#a855f7'
            },
            category_orders={'status_gizi': ['Gizi Buruk', 'Gizi Kurang', 'Gizi Normal', 'Gizi Lebih']},
            labels={'status_gizi': 'Status Gizi', sel_nutri: label}
        )
        fig.update_layout(showlegend=False, plot_bgcolor='white', paper_bgcolor='white',
                          height=380, margin=dict(t=10),
                          font=dict(family='Plus Jakarta Sans'),
                          yaxis=dict(gridcolor='#f1f5f9'))
        st.plotly_chart(fig, use_container_width=True)

        # Budget harian
        st.markdown('<div class="section-title">Distribusi Budget Harian MPASI</div>', unsafe_allow_html=True)
        fig3 = px.histogram(df_profile, x='budget_harian', nbins=30,
                            color_discrete_sequence=['#14b8a6'],
                            labels={'budget_harian': 'Budget Harian (Rp)'})
        fig3.update_layout(plot_bgcolor='white', paper_bgcolor='white',
                           margin=dict(t=10), height=300,
                           yaxis=dict(gridcolor='#f1f5f9'),
                           font=dict(family='Plus Jakarta Sans'))
        st.plotly_chart(fig3, use_container_width=True)

        st.markdown("""
        <div class="insight-box">
        📌 <strong>Insight Nutrisi:</strong>
        Anak dengan <strong>Gizi Buruk</strong> memiliki target kalori lebih rendah namun variasinya tinggi — mencerminkan kondisi kesehatan yang heterogen.
        Budget harian MPASI bervariasi luas antara <strong>Rp 3.500 – Rp 125.000</strong> dengan median ~Rp 49.500,
        mengindikasikan perbedaan kemampuan ekonomi yang signifikan antar keluarga.
        </div>
        """, unsafe_allow_html=True)

    # ── TAB 3: UMUR & GENDER ──
    with tab3:
        st.markdown('<div class="section-title">Distribusi Umur Anak (Bulan)</div>', unsafe_allow_html=True)
        fig = px.histogram(df_profile, x='umur_bulan', nbins=19,
                           color_discrete_sequence=['#6366f1'],
                           labels={'umur_bulan': 'Umur (Bulan)'})
        fig.update_layout(plot_bgcolor='white', paper_bgcolor='white',
                          height=300, margin=dict(t=10),
                          yaxis=dict(gridcolor='#f1f5f9'),
                          font=dict(family='Plus Jakarta Sans'))
        st.plotly_chart(fig, use_container_width=True)

        col_a, col_b = st.columns(2)
        with col_a:
            st.markdown('<div class="section-title">Umur vs Target Kalori</div>', unsafe_allow_html=True)
            fig2 = px.scatter(
                df_profile, x='umur_bulan', y='target_kalori_kkal',
                color='status_gizi',
                color_discrete_map={'Gizi Normal':'#22c55e','Gizi Kurang':'#f59e0b','Gizi Buruk':'#ef4444','Gizi Lebih':'#a855f7'},
                opacity=0.5, size_max=4,
                labels={'umur_bulan': 'Umur (Bulan)', 'target_kalori_kkal': 'Target Kalori (kkal)'}
            )
            fig2.update_layout(plot_bgcolor='white', paper_bgcolor='white',
                               height=320, margin=dict(t=10),
                               font=dict(family='Plus Jakarta Sans'),
                               yaxis=dict(gridcolor='#f1f5f9'))
            st.plotly_chart(fig2, use_container_width=True)

        with col_b:
            st.markdown('<div class="section-title">Status Gizi per Kelompok Umur</div>', unsafe_allow_html=True)
            grp = df_profile.groupby(['kelompok_umur', 'status_gizi'], observed=True).size().reset_index(name='jumlah')
            fig3 = px.bar(grp, x='kelompok_umur', y='jumlah', color='status_gizi',
                          barmode='group',
                          color_discrete_map={'Gizi Normal':'#22c55e','Gizi Kurang':'#f59e0b','Gizi Buruk':'#ef4444','Gizi Lebih':'#a855f7'},
                          labels={'kelompok_umur': 'Kelompok Umur', 'jumlah': 'Jumlah', 'status_gizi': 'Status'})
            fig3.update_layout(plot_bgcolor='white', paper_bgcolor='white',
                               height=320, margin=dict(t=10),
                               yaxis=dict(gridcolor='#f1f5f9'),
                               font=dict(family='Plus Jakarta Sans'))
            st.plotly_chart(fig3, use_container_width=True)

        st.markdown("""
        <div class="insight-box">
        📌 <strong>Insight Umur:</strong>
        Distribusi umur relatif merata dari 6–24 bulan. Terdapat tren <strong>peningkatan target kalori seiring bertambahnya umur</strong>,
        konsisten dengan kebutuhan energi yang meningkat. Gizi buruk dan kurang tersebar merata di semua kelompok umur,
        menunjukkan masalah gizi tidak terbatas pada usia tertentu.
        </div>
        """, unsafe_allow_html=True)

    # ── TAB 4: ALERGI & PREFERENSI ──
    with tab4:
        st.markdown('<div class="section-title">Top 15 Makanan Kesukaan</div>', unsafe_allow_html=True)
        import ast, re

        def extract_items(series):
            counts = {}
            for val in series.dropna():
                try:
                    items = ast.literal_eval(str(val))
                    for item in items:
                        item = item.strip().title()
                        counts[item] = counts.get(item, 0) + 1
                except:
                    pass
            return pd.Series(counts).sort_values(ascending=False)

        makanan_counts = extract_items(df_profile['makanan_kesukaan']).head(15)
        fig = px.bar(
            x=makanan_counts.values, y=makanan_counts.index,
            orientation='h', color=makanan_counts.values,
            color_continuous_scale='Teal',
            labels={'x': 'Jumlah', 'y': 'Makanan'}
        )
        fig.update_layout(showlegend=False, plot_bgcolor='white', paper_bgcolor='white',
                          height=430, margin=dict(t=10),
                          yaxis=dict(autorange='reversed'),
                          coloraxis_showscale=False,
                          font=dict(family='Plus Jakarta Sans'))
        st.plotly_chart(fig, use_container_width=True)

        st.markdown('<div class="section-title">Top 15 Potensi Alergi</div>', unsafe_allow_html=True)
        alergi_counts = extract_items(df_profile['potensi_alergi']).head(15)
        fig2 = px.bar(
            x=alergi_counts.values, y=alergi_counts.index,
            orientation='h', color=alergi_counts.values,
            color_continuous_scale='Reds',
            labels={'x': 'Jumlah', 'y': 'Alergen'}
        )
        fig2.update_layout(showlegend=False, plot_bgcolor='white', paper_bgcolor='white',
                           height=430, margin=dict(t=10),
                           yaxis=dict(autorange='reversed'),
                           coloraxis_showscale=False,
                           font=dict(family='Plus Jakarta Sans'))
        st.plotly_chart(fig2, use_container_width=True)

        st.markdown("""
        <div class="insight-box">
        📌 <strong>Insight Preferensi & Alergi:</strong>
        Data preferensi dan potensi alergi menunjukkan variasi yang kaya, yang menjadi tantangan utama dalam sistem rekomendasi.
        Sistem harus mampu memfilter menu berdasarkan alergen sekaligus mempertimbangkan preferensi makanan anak
        agar rekomendasi dapat diterima dan aman dikonsumsi.
        </div>
        """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════
# PAGE 3: EDA DATA LABELLING
# ═══════════════════════════════════════════════
elif page == "🧪 EDA Data Labelling":
    st.markdown("""
    <div class="page-header">
        <h1>🧪 EDA Data Labelling</h1>
        <p>Analisis skor kecocokan menu MPASI, distribusi harga, dan pola relevansi</p>
    </div>
    """, unsafe_allow_html=True)

    tab1, tab2, tab3 = st.tabs(["🎯 Skor Kecocokan", "💰 Harga & Budget", "📈 Korelasi & Pola"])

    # ── TAB 1: SKOR KECOCOKAN ──
    with tab1:
        col1, col2 = st.columns(2)
        with col1:
            st.markdown('<div class="section-title">Distribusi Skor Kecocokan</div>', unsafe_allow_html=True)
            sample = df_lab.sample(min(200000, len(df_lab)), random_state=42)
            fig = px.histogram(sample, x='label_skor_kecocokan', nbins=40,
                               color_discrete_sequence=['#6366f1'],
                               labels={'label_skor_kecocokan': 'Skor Kecocokan'})
            fig.add_vline(x=0.5, line_dash='dash', line_color='red',
                          annotation_text='Threshold 0.5', annotation_position='top right')
            fig.update_layout(plot_bgcolor='white', paper_bgcolor='white',
                              height=340, margin=dict(t=10),
                              yaxis=dict(gridcolor='#f1f5f9'),
                              font=dict(family='Plus Jakarta Sans'))
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            st.markdown('<div class="section-title">Persentase Skor > 0.5</div>', unsafe_allow_html=True)
            above = (df_lab['label_skor_kecocokan'] > 0.5).sum()
            below = len(df_lab) - above
            fig2 = go.Figure(go.Pie(
                labels=['Relevan (>0.5)', 'Tidak Relevan (≤0.5)'],
                values=[above, below],
                hole=0.55,
                marker_colors=['#22c55e', '#f43f5e'],
                textinfo='label+percent',
                textfont_size=13
            ))
            fig2.update_layout(showlegend=False, paper_bgcolor='white',
                               height=340, margin=dict(t=10),
                               font=dict(family='Plus Jakarta Sans'))
            st.plotly_chart(fig2, use_container_width=True)

        st.markdown('<div class="section-title">Distribusi Binary Label per Recipe (Top 20)</div>', unsafe_allow_html=True)
        top_recipes = df_lab.groupby('recipe_id')['binary_label'].mean().sort_values(ascending=False).head(20).reset_index()
        top_recipes.columns = ['Recipe ID', 'Avg Relevansi']
        top_recipes['Recipe ID'] = top_recipes['Recipe ID'].astype(str)
        fig3 = px.bar(top_recipes, x='Recipe ID', y='Avg Relevansi',
                      color='Avg Relevansi', color_continuous_scale='Greens',
                      labels={'Avg Relevansi': 'Rata-rata Relevansi'})
        fig3.update_layout(plot_bgcolor='white', paper_bgcolor='white',
                           height=300, margin=dict(t=10),
                           yaxis=dict(gridcolor='#f1f5f9'),
                           coloraxis_showscale=False,
                           font=dict(family='Plus Jakarta Sans'))
        st.plotly_chart(fig3, use_container_width=True)

        st.markdown("""
        <div class="insight-box">
        📌 <strong>Insight Skor Kecocokan:</strong>
        Distribusi skor bersifat <strong>bimodal</strong> dengan puncak di nilai 0 dan sekitar 0.5–0.6.
        Hanya <strong>34.5%</strong> pasangan menu-pengguna memiliki skor relevansi > 0.5.
        Imbalance kelas ini perlu ditangani dalam proses pelatihan model rekomendasi.
        Beberapa recipe secara konsisten mendapat skor tinggi, menandakan menu yang lebih universally sesuai.
        </div>
        """, unsafe_allow_html=True)

    # ── TAB 2: HARGA & BUDGET ──
    with tab2:
        st.markdown('<div class="section-title">Distribusi Harga Menu MPASI (budget_real)</div>', unsafe_allow_html=True)
        sample = df_lab.sample(min(100000, len(df_lab)), random_state=42)
        fig = px.histogram(sample, x='budget_real', nbins=30,
                           color_discrete_sequence=['#14b8a6'],
                           labels={'budget_real': 'Harga Menu (Rp)'})
        fig.update_layout(plot_bgcolor='white', paper_bgcolor='white',
                          height=300, margin=dict(t=10),
                          yaxis=dict(gridcolor='#f1f5f9'),
                          font=dict(family='Plus Jakarta Sans'))
        st.plotly_chart(fig, use_container_width=True)

        col_a, col_b = st.columns(2)
        with col_a:
            st.markdown('<div class="section-title">Boxplot Harga Menu</div>', unsafe_allow_html=True)
            fig2 = px.box(sample, x='budget_real',
                          color_discrete_sequence=['#f59e0b'],
                          labels={'budget_real': 'Harga Menu (Rp)'})
            fig2.update_layout(plot_bgcolor='white', paper_bgcolor='white',
                               height=260, margin=dict(t=10),
                               font=dict(family='Plus Jakarta Sans'))
            st.plotly_chart(fig2, use_container_width=True)

        with col_b:
            st.markdown('<div class="section-title">Rata-rata Skor per Kategori Harga</div>', unsafe_allow_html=True)
            avg_score = sample.groupby('kategori_harga', observed=True)['label_skor_kecocokan'].mean().reset_index()
            fig3 = px.bar(avg_score, x='kategori_harga', y='label_skor_kecocokan',
                          color='label_skor_kecocokan', color_continuous_scale='Blues',
                          labels={'kategori_harga': 'Kategori Harga', 'label_skor_kecocokan': 'Rata-rata Skor'})
            fig3.update_layout(plot_bgcolor='white', paper_bgcolor='white',
                               height=260, margin=dict(t=10),
                               yaxis=dict(gridcolor='#f1f5f9'),
                               coloraxis_showscale=False,
                               font=dict(family='Plus Jakarta Sans'))
            st.plotly_chart(fig3, use_container_width=True)

        st.markdown("""
        <div class="insight-box">
        📌 <strong>Insight Harga:</strong>
        Mayoritas menu MPASI berada pada rentang harga <strong>Rp 5.000 – Rp 10.000</strong> dengan median ~Rp 8.000.
        Terdapat outlier di atas Rp 15.000 – Rp 25.000 yang perlu diperhatikan.
        Harga menu tidak menunjukkan pengaruh yang kuat terhadap skor kecocokan — artinya
        <strong>relevansi lebih dipengaruhi kesesuaian nutrisi</strong> daripada harga menu.
        </div>
        """, unsafe_allow_html=True)

    # ── TAB 3: KORELASI ──
    with tab3:
        st.markdown('<div class="section-title">Heatmap Korelasi Variabel Numerik (Data Labelling)</div>', unsafe_allow_html=True)
        sample = df_lab.sample(min(50000, len(df_lab)), random_state=42)
        corr_cols = ['label_skor_kecocokan', 'label_budget', 'budget_real', 'binary_label']
        corr = sample[corr_cols].corr()

        fig = px.imshow(
            corr, text_auto='.2f',
            color_continuous_scale='RdBu_r',
            zmin=-1, zmax=1,
            labels={'color': 'Korelasi'},
            aspect='auto'
        )
        fig.update_layout(paper_bgcolor='white', height=380, margin=dict(t=10),
                          font=dict(family='Plus Jakarta Sans'))
        st.plotly_chart(fig, use_container_width=True)

        st.markdown('<div class="section-title">Heatmap Korelasi Profil Anak</div>', unsafe_allow_html=True)
        num_cols = ['umur_bulan','tinggi','berat','zscore_hfa','zscore_wfa','zscore_wfh',
                    'budget_harian','target_kalori_kkal','target_protein_g','target_lemak_g']
        corr2 = df_profile[num_cols].corr()
        fig2 = px.imshow(
            corr2, text_auto='.2f',
            color_continuous_scale='RdBu_r',
            zmin=-1, zmax=1,
            aspect='auto'
        )
        fig2.update_layout(paper_bgcolor='white', height=450, margin=dict(t=10),
                           font=dict(family='Plus Jakarta Sans'))
        st.plotly_chart(fig2, use_container_width=True)

        st.markdown("""
        <div class="insight-box">
        📌 <strong>Insight Korelasi:</strong>
        Pada data profil, <strong>umur berkorelasi positif kuat</strong> dengan target kalori, protein, lemak — sesuai kebutuhan tumbuh kembang.
        Berat badan berkorelasi positif dengan z-score WFA dan WFH. Pada data labelling,
        <strong>label_skor_kecocokan dan binary_label berkorelasi sangat tinggi</strong> (derivasi langsung),
        sedangkan harga (budget_real) hampir tidak berkorelasi dengan skor kecocokan.
        </div>
        """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════
# PAGE 4: KESIMPULAN
# ═══════════════════════════════════════════════
elif page == "💡 Kesimpulan":
    st.markdown("""
    <div class="page-header">
        <h1>💡 Kesimpulan & Rekomendasi</h1>
        <p>Ringkasan temuan utama dari EDA dan implikasi untuk pengembangan model</p>
    </div>
    """, unsafe_allow_html=True)

    findings = [
        ("1. Dominasi Gizi Buruk & Kurang", "#ef4444",
         "66.3% anak dalam dataset mengalami gizi buruk atau kurang berdasarkan z-score WHO (HFA/WFA/WFH). "
         "Ini menegaskan urgensi sistem rekomendasi MPASI yang dipersonalisasi."),
        ("2. Distribusi Z-Score Bergeser Negatif", "#f59e0b",
         "Tiga indikator z-score (HFA, WFA, WFH) semuanya menunjukkan distribusi miring ke kiri, "
         "dengan banyak nilai ekstrem di bawah -3 SD, mengindikasikan kondisi stunting dan wasting."),
        ("3. Kebutuhan Nutrisi Berbeda Signifikan per Kelompok", "#3b82f6",
         "Target kalori, protein, lemak meningkat signifikan seiring umur. "
         "Status gizi juga memengaruhi kebutuhan nutrisi — model perlu mempersonalisasi rekomendasi berdasarkan keduanya."),
        ("4. Budget Keluarga Sangat Bervariasi", "#14b8a6",
         "Budget harian MPASI berkisar Rp 3.500 – Rp 125.000 (median Rp 49.500). "
         "Sistem rekomendasi harus mempertimbangkan constraint budget secara fleksibel."),
        ("5. Imbalance Data Labelling (65.5% Tidak Relevan)", "#a855f7",
         "Hanya 34.5% pasangan menu-pengguna memiliki skor kecocokan > 0.5. "
         "Diperlukan teknik handling imbalance (oversampling/undersampling/weighted loss) saat melatih model."),
        ("6. Harga Menu Tidak Dominan Menentukan Relevansi", "#22c55e",
         "Korelasi antara harga menu dan skor kecocokan sangat rendah. "
         "Faktor utama penentu relevansi adalah kesesuaian nutrisi dan kondisi anak, bukan harga."),
    ]

    for title, color, desc in findings:
        st.markdown(f"""
        <div style="background:white; border-radius:14px; padding:18px 22px;
                    border-left:5px solid {color}; box-shadow:0 2px 10px rgba(0,0,0,0.06);
                    margin-bottom:14px;">
            <div style="font-weight:700; font-size:1rem; color:#1e293b; margin-bottom:6px;">{title}</div>
            <div style="font-size:0.88rem; color:#475569; line-height:1.7;">{desc}</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown("""
    <div style="background:linear-gradient(135deg,#1e3a5f,#1e5f74);border-radius:16px;padding:24px 28px;color:white;">
        <div style="font-size:1.1rem;font-weight:800;margin-bottom:12px;">🚀 Rekomendasi untuk Pengembangan Model</div>
        <ul style="font-size:0.9rem;line-height:2;color:#bfdbfe;margin:0;padding-left:20px;">
            <li>Gunakan <strong style="color:white">fitur z-score dan kelompok umur</strong> sebagai fitur utama dalam model nutrisi</li>
            <li>Terapkan <strong style="color:white">teknik SMOTE atau class weighting</strong> untuk menangani imbalance data labelling</li>
            <li>Tambahkan <strong style="color:white">filtering berbasis alergi dan preferensi</strong> sebelum proses ranking menu</li>
            <li>Pertimbangkan <strong style="color:white">multi-objective recommendation</strong>: skor nutrisi + budget constraint + alergi</li>
            <li>Validasi model menggunakan <strong style="color:white">metrik recall tinggi</strong> agar menu relevan tidak terlewat</li>
        </ul>
    </div>
    """, unsafe_allow_html=True)
