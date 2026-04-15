'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, TrendingDown, TrendingUp, Presentation, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DataProps {
    reportData: {
        incomeStatement: { revenues: any, expenses: any, totalRevenue: number, totalExpenses: number, netIncome: number };
        balanceSheet: { totalAssets: number, equity: any, totalLiabilitiesAndEquity: number };
    }
}

export function AdvancedBEPROIAnalysis({ reportData }: DataProps) {
    const { incomeStatement, balanceSheet } = reportData;
    const { totalRevenue, expenses, netIncome } = incomeStatement;
    const { totalAssets, equity } = balanceSheet;

    // --- Core BEP Math ---
    // Variable Cost: Only Harga Pokok Penjualan (COGS)
    const variableCosts = expenses['Harga Pokok Penjualan'] || 0;

    // Fixed Cost: All other operational expenses
    const fixedCosts = Object.entries(expenses).reduce((sum, [name, amt]) => {
        return name === 'Harga Pokok Penjualan' ? sum : sum + (amt as number);
    }, 0);

    const totalCosts = variableCosts + fixedCosts;

    // Margin Calculations
    const contributionMargin = totalRevenue - variableCosts;
    const contributionMarginRatio = totalRevenue > 0 ? (contributionMargin / totalRevenue) : 0;

    // BEP (Break Even Point in Rupiah)
    const bepRupiah = contributionMarginRatio > 0 ? (fixedCosts / contributionMarginRatio) : 0;

    // Margin of Safety calculation
    const marginOfSafetyRp = totalRevenue - bepRupiah;
    const marginOfSafetyPercent = totalRevenue > 0 ? (marginOfSafetyRp / totalRevenue) * 100 : 0;

    // --- Core ROI / ROA Math ---
    // Original investment / Total Equity beginning
    const ownerEquity = equity['Modal Pemilik'] || 0;
    // We use Modal Pemilik as the basis. If they have massive retained earnings, true Equity is higher.
    const totalEquity = (equity['Modal Pemilik'] || 0) + (equity['Laba Ditahan'] || 0);

    const roi = totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0;
    const roa = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;

    // --- Chart Data Generation (Scenario from 0 to 200% of current revenue) ---
    const generateChartData = () => {
        const data = [];
        const stepCount = 20; // Generate 20 data points
        // Base range on BEP. If BEP is super high, make graph go to BEP * 1.5. If revenue is higher, go to Revenue * 1.5.
        const maxRange = Math.max(totalRevenue, bepRupiah) * 1.5 || 1000000;
        const stepSize = maxRange / stepCount;

        for (let i = 0; i <= stepCount; i++) {
            const currentSimulationRevenue = i * stepSize;

            // Assume variable cost behaves linearly proportionally to Revenue
            const simulatedVariableCost = contributionMarginRatio > 0 ? (currentSimulationRevenue * (1 - contributionMarginRatio)) : 0;
            const simulatedTotalCost = fixedCosts + simulatedVariableCost;

            data.push({
                xRevenue: currentSimulationRevenue,
                formattedX: formatCurrency(currentSimulationRevenue).replace(',00', ''), // Cleaner label
                "Biaya Tetap (Abu)": fixedCosts,
                "Total Biaya (Merah)": simulatedTotalCost,
                "Pendapatan (Biru)": currentSimulationRevenue,
            });
        }
        return data;
    };
    const chartData = generateChartData();

    // --- Business Health Heuristics (Problem Solving AI) ---
    const getHealthState = () => {
        if (totalRevenue === 0 && totalCosts === 0) return 'EMPTY';
        if (totalRevenue < bepRupiah) return 'DANGER';
        if (marginOfSafetyPercent < 15) return 'WARNING'; // Less than 15% margin of safety
        if (roi > 20 && marginOfSafetyPercent > 30) return 'EXCELLENT';
        return 'HEALTHY';
    };

    const healthState = getHealthState();

    return (
        <div className="space-y-6">

            {/* Header / Condition Alert */}
            <h2 className="text-2xl font-bold tracking-tight">Audit & Investor Executive Dashboard</h2>
            <p className="text-muted-foreground mb-4">
                Panel ini menyajikan ringkasan kesehatan finansial yang disesuaikan untuk kebutuhan audit internal, pelaporan investor, atau valuasi takeover.
            </p>

            {healthState === 'DANGER' && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <AlertTitle className="text-red-800 font-bold ml-2">CRITICAL ALERT (REVENUE UNDER BEP)</AlertTitle>
                    <AlertDescription className="text-red-700 ml-2 mt-2 space-y-2">
                        <p><strong>Status Saat Ini:</strong> Perusahaan saat ini mengalami kerugian operasional dan belum mencapai Titik Impas (BEP). Pendapatan masih berjarak {formatCurrency(bepRupiah - totalRevenue)} untuk sekadar menutup biaya.</p>
                        <p><strong>Problem Solving (Mitigasi Kolaps):</strong></p>
                        <ul className="list-disc ml-5 text-xs font-medium opacity-90">
                            <li><strong>Cut-Off Biaya Tetap:</strong> Lakukan audit ketat pada Beban Operasional (Sewa, Gaji manajemen, langganan yang tidak esensial). Biaya tetap saat ini membebani bisnis sebesar {formatCurrency(fixedCosts)}.</li>
                            <li><strong>Evaluasi HPP (Harga Pokok):</strong> Negosiasi dengan supplier untuk menurunkan HPP, atau evaluasi menaikkan Harga Jual agar Margin Kontribusi membesar.</li>
                            <li><strong>Intervensi Modal:</strong> Jika ini adalah masa perintisan (fase bakar uang), pastikan cadangan kas (runway) cukup, dan sampaikan kepada investor bahwa investasi lanjutan dibutuhkan untuk scale-up operasional.</li>
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {healthState === 'WARNING' && (
                <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <AlertTitle className="text-yellow-800 font-bold ml-2">WARNING (MARGIN OF SAFETY RENDAH)</AlertTitle>
                    <AlertDescription className="text-yellow-700 ml-2 mt-2 space-y-2">
                        <p><strong>Status Saat Ini:</strong> Perusahaan berhasil melewati level impas, namun berada dalam batas toleransi yang rentan (Margin of Safety hanya {marginOfSafetyPercent.toFixed(2)}%). Penurunan kecil pada penjualan akan langsung menyebabkan kerugian bersih.</p>
                        <p><strong>Review Audit & Investor:</strong> Bisnis sedang di fase tidak stabil. Pihak manajemen harus fokus pada retensi pelanggan agresif dan menghindari penambahan aset / biaya tetap baru sebelum volume penjualan stabil.</p>
                    </AlertDescription>
                </Alert>
            )}

            {healthState === 'HEALTHY' && (
                <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <AlertTitle className="text-green-800 font-bold ml-2">SEHAT & PROFITABLE</AlertTitle>
                    <AlertDescription className="text-green-700 ml-2 mt-2">
                        <p><strong>Status Saat Ini:</strong> Fundamental usaha terlihat mantap. Pendapatan berada di level yang aman di atas Titik Impas dengan Margin of safety di angka {marginOfSafetyPercent.toFixed(2)}%.</p>
                        <p><strong>Takeover/Investor Insight:</strong> Bisnis memiliki ketahanan pasar yang cukup baik. Ini momentum berharga untuk pitching ke investor terkait rencana ekspansi, karena core-business sudah terbukti mampu sustain operasi secara mandiri.</p>
                    </AlertDescription>
                </Alert>
            )}

            {healthState === 'EXCELLENT' && (
                <Alert className="bg-emerald-50 border-emerald-200">
                    <Presentation className="h-5 w-5 text-emerald-600" />
                    <AlertTitle className="text-emerald-800 font-bold ml-2">KEUANGAN SANGAT PRIMA (HIGH ROI)</AlertTitle>
                    <AlertDescription className="text-emerald-700 ml-2 mt-2">
                        <p><strong>Status Saat Ini:</strong> Luar biasa! Pengembalian modal (ROI) sangat memuaskan di tingkat {roi.toFixed(2)}% dengan bantalan aman (Margin of Safety {marginOfSafetyPercent.toFixed(2)}%). Risiko kebangkrutan operasional sangat rendah.</p>
                        <p><strong>Takeover/Investor Insight:</strong> Saat ini, bisnis memiliki daya tawar valuasi (Multiplier) yang tinggi di mata investor atau bila hendak diakuisi. Rekomendasinya, manfaatkan *cash-flow* untuk eskalasi bisnis tanpa harus bergantung banyak pada utang luar.</p>
                    </AlertDescription>
                </Alert>
            )}

            {/* Metric Row 1: The Break Even Block */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Titik Impas (BEP Rupiah)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">{formatCurrency(bepRupiah)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Target mutlak yang harus dicapai agar tidak merugi.</p>
                        <div className="mt-3 text-[11px] text-slate-500 bg-slate-100/50 p-2 rounded">
                            <strong className="text-slate-700">Cara Hitung:</strong> Total Biaya Tetap dibagi Rasio Margin Kontribusi.
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Batas Aman (Margin of Safety)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">{marginOfSafetyPercent.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground mt-1">Sisa porsi aman sebelum penjualan jeblok ke level rugi.</p>
                        <div className="mt-3 text-[11px] text-slate-500 bg-slate-100/50 p-2 rounded">
                            <strong className="text-slate-700">Cara Hitung:</strong> (Total Pendapatan Aktual - BEP Rupiah) / Total Pendapatan Aktual.
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Biaya Tetap</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">{formatCurrency(fixedCosts)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Beban yang harus ditanggung lepas ada/tidaknya penjualan.</p>
                        <div className="mt-3 text-[11px] text-slate-500 bg-slate-100/50 p-2 rounded">
                            <strong className="text-slate-700">Cara Hitung:</strong> Total Semua Beban Operasional dikurangi HPP.
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Rasio Margin Kontribusi</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">{(contributionMarginRatio * 100).toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground mt-1">Daya tuas setiap 1 Rupiah penjualan terhadap laba.</p>
                        <div className="mt-3 text-[11px] text-slate-500 bg-slate-100/50 p-2 rounded">
                            <strong className="text-slate-700">Cara Hitung:</strong> (Pendapatan - Beban HPP) dibagi Pendapatan.
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Metric Row 2: Investment Analysis Block */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-2">
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-600 font-semibold">Tingkat Pengembalian Modal (ROI)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-slate-800">{roi.toFixed(2)}%</div>
                        <p className="text-xs text-slate-500 mt-1">Return on Investment dari total Ekuitas.</p>
                        <div className="mt-3 text-[11px] text-slate-500 bg-slate-100/50 p-2 rounded">
                            <strong className="text-slate-700">Cara Hitung:</strong> (Laba Bersih / Total Ekuitas) x 100%.
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-600 font-semibold">Return on Asset (ROA)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-slate-800">{roa.toFixed(2)}%</div>
                        <p className="text-xs text-slate-500 mt-1">Efektivitas total aset yang dimiliki mencetak laba.</p>
                        <div className="mt-3 text-[11px] text-slate-500 bg-slate-100/50 p-2 rounded">
                            <strong className="text-slate-700">Cara Hitung:</strong> (Laba Bersih / Total Aset) x 100%.
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-600 font-semibold">Modal Sendiri (Owner Equity)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-slate-800">{formatCurrency(ownerEquity)}</div>
                        <p className="text-xs text-slate-500 mt-1">Nilai modal yang ditanam ke bisnis.</p>
                        <div className="mt-3 text-[11px] text-slate-500 bg-slate-100/50 p-2 rounded">
                            <strong className="text-slate-700">Sumber:</strong> Diambil langsung dari saldo Modal Pemilik awal + Laba Ditahan di Neraca.
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-600 font-semibold">Aset Penjamin</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-slate-800">{formatCurrency(totalAssets)}</div>
                        <p className="text-xs text-slate-500 mt-1">Total kekuatan aset saat ini.</p>
                        <div className="mt-3 text-[11px] text-slate-500 bg-slate-100/50 p-2 rounded">
                            <strong className="text-slate-700">Sumber:</strong> Diambil dari Total Aset di Neraca.
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* The Specific Requested BEP Chart */}
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="text-xl">Grafik Akurasi Titik Impas (BEP Projection)</CardTitle>
                    <CardDescription>
                        Simulasi titik kritis ketika Pendapatan (Garis Biru) memotong Total Biaya (Garis Merah). Garis Abu mendeskripsikan beban menetap/Fixed Cost yang membebani setiap bulannya.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis
                                    dataKey="xRevenue"
                                    type="number"
                                    domain={[0, 'dataMax']}
                                    tickFormatter={(val) => new Intl.NumberFormat('id-ID', { notation: "compact", compactDisplay: "short" }).format(val)}
                                />
                                <YAxis
                                    tickFormatter={(val) => new Intl.NumberFormat('id-ID', { notation: "compact", compactDisplay: "short" }).format(val)}
                                />
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    labelFormatter={(label: number) => `Simulasi Pendapatan: ${formatCurrency(label)}`}
                                />
                                <Legend />

                                {/* Garis Abu: Fixed Costs */}
                                <Line
                                    type="step"
                                    dataKey="Biaya Tetap (Abu)"
                                    stroke="#94a3b8"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={false}
                                />

                                {/* Garis Merah: Total Costs */}
                                <Line
                                    type="monotone"
                                    dataKey="Total Biaya (Merah)"
                                    stroke="#ef4444"
                                    strokeWidth={3}
                                    dot={false}
                                />

                                {/* Garis Biru: Revenue */}
                                <Line
                                    type="monotone"
                                    dataKey="Pendapatan (Biru)"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}

