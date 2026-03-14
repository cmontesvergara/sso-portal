import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsManagementService, StatsResponseDTO } from 'src/app/core/services/stats-management.service';
import { NgApexchartsModule, ChartComponent, ApexNonAxisChartSeries, ApexResponsive, ApexChart, ApexAxisChartSeries, ApexDataLabels, ApexPlotOptions, ApexYAxis, ApexLegend, ApexStroke, ApexXAxis, ApexFill, ApexTooltip } from 'ng-apexcharts';

export type DonutChartOptions = {
    series: ApexNonAxisChartSeries;
    chart: ApexChart;
    responsive: ApexResponsive[];
    labels: any;
    colors: any;
    legend: ApexLegend;
};

export type RadialChartOptions = {
    series: ApexNonAxisChartSeries;
    chart: ApexChart;
    plotOptions: ApexPlotOptions;
    labels: string[];
    colors: string[];
};

export type BarChartOptions = {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    dataLabels: ApexDataLabels;
    plotOptions: ApexPlotOptions;
    yaxis: ApexYAxis;
    xaxis: ApexXAxis;
    fill: ApexFill;
    tooltip: ApexTooltip;
    stroke: ApexStroke;
    legend: ApexLegend;
    colors: string[];
};

@Component({
    selector: 'app-stats',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule],
    templateUrl: './stats.component.html',
    styleUrls: ['./stats.component.scss']
})
export class StatsComponent implements OnInit {
    stats: StatsResponseDTO | null = null;
    isLoading: boolean = true;
    error: string | null = null;

    public userStatusChartOptions: Partial<DonutChartOptions> = {};
    public appsChartOptions: Partial<RadialChartOptions> = {};
    public sessionsChartOptions: Partial<BarChartOptions> = {};

    constructor(private statsService: StatsManagementService) { }

    ngOnInit(): void {
        this.loadStats();
    }

    loadStats(): void {
        this.isLoading = true;
        this.error = null;

        this.statsService.getGlobalStats().subscribe({
            next: (res) => {
                if (res.success && res.stats) {
                    this.stats = res.stats;
                    this.initCharts(res.stats);
                } else {
                    this.error = 'No se pudieron cargar las estadísticas.';
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error fetching stats:', err);
                this.error = 'Ocurrió un error al intentar cargar las estadísticas del sistema.';
                this.isLoading = false;
            }
        });
    }

    private initCharts(stats: StatsResponseDTO): void {
        // 1. Users Donut Chart
        this.userStatusChartOptions = {
            series: [stats.activeUsers, stats.inactiveUsers, stats.suspendedUsers, stats.deletedUsers],
            chart: {
                type: "donut",
                height: 350,
                fontFamily: 'Inter, sans-serif'
            },
            labels: ["Activos", "Inactivos", "Suspendidos", "Eliminados"],
            colors: ['#10B981', '#F59E0B', '#EF4444', '#6B7280'],
            legend: {
                position: 'bottom'
            },
            responsive: [
                {
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 200
                        },
                        legend: {
                            position: "bottom"
                        }
                    }
                }
            ]
        };

        // 2. Apps Radial Bar Chart
        const activePercent = stats.totalApps > 0 ? Math.round((stats.activeApps / stats.totalApps) * 100) : 0;
        this.appsChartOptions = {
            series: [activePercent],
            chart: {
                height: 350,
                type: "radialBar",
                fontFamily: 'Inter, sans-serif'
            },
            plotOptions: {
                radialBar: {
                    hollow: {
                        size: "70%"
                    },
                    dataLabels: {
                        name: {
                            show: true,
                            color: "#6B7280"
                        },
                        value: {
                            show: true,
                            color: "#111827",
                            fontSize: "36px",
                            fontWeight: 700
                        }
                    }
                }
            },
            labels: ["Apps Activas"],
            colors: ['#6366F1']
        };

        // 3. Sessions Bar Chart
        const sessionCategories = ["SSO"];
        const sessionData = [stats.activeSsoSessions];

        if (stats.appSessionsDetails && stats.appSessionsDetails.length > 0) {
            stats.appSessionsDetails.forEach(detail => {
                sessionCategories.push(detail.appName || detail.appId);
                sessionData.push(detail.activeSessions);
            });
        } else {
            // Fallback if details are not available
            sessionCategories.push("Aplicaciones Hijas");
            sessionData.push(stats.activeAppSessions);
        }

        this.sessionsChartOptions = {
            series: [
                {
                    name: "Sesiones Concurrentes",
                    data: sessionData
                }
            ],
            chart: {
                type: "bar",
                height: 350,
                fontFamily: 'Inter, sans-serif',
                toolbar: {
                    show: false
                }
            },
            colors: ['#8B5CF6'],
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: "45%",
                    borderRadius: 4
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                show: true,
                width: 2,
                colors: ["transparent"]
            },
            xaxis: {
                categories: sessionCategories,
                labels: {
                    style: {
                        colors: '#6B7280'
                    }
                }
            },
            yaxis: {
                title: {
                    text: "Cantidad de Sesiones",
                    style: {
                        color: '#6B7280'
                    }
                },
                labels: {
                    style: {
                        colors: '#6B7280'
                    }
                }
            },
            fill: {
                opacity: 1
            },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val + " activas";
                    }
                }
            }
        };
    }
}
