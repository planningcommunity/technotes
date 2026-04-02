<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        /* 1. Allow the body to scroll if needed, but keep container clean */
        body { margin: 0; padding: 0; width: 100%; height: 100%; }
        
        /* 2. Container for the chart to control height */
        .chart-container {
            position: relative;
            width: 100%;
            height: 100vh; /* Use full available height */
        }
    </style>
</head>
<body>

    <div class="chart-container">
        <canvas id="myChart"></canvas>
    </div>

    <script>
        let myChart = null; 

        window.onmessage = (event) => {
            const data = event.data;
            if (data && data.labels) {
                renderChart(data);
            }
        };

        // --- HELPER: WRAP LONG TEXT ---
        // Splits long sentences into multiple lines (arrays) for Chart.js
        function formatLabels(labels) {
            const maxLen = 15; // Max characters per line before breaking
            return labels.map(label => {
                if (label.length > maxLen) {
                    // Split roughly in half or by words
                    const words = label.split(' ');
                    let lines = [];
                    let currentLine = words[0];

                    for (let i = 1; i < words.length; i++) {
                        if (currentLine.length + words[i].length < maxLen) {
                            currentLine += ' ' + words[i];
                        } else {
                            lines.push(currentLine);
                            currentLine = words[i];
                        }
                    }
                    lines.push(currentLine);
                    return lines;
                } else {
                    return label;
                }
            });
        }

        function renderChart(chartData) {
            const ctx = document.getElementById('myChart').getContext('2d');
            
            // --- RESPONSIVE FONT SIZING ---
            // If screen is narrow (mobile), use size 11, otherwise 14
            const isMobile = window.innerWidth < 480;
            const fontSize = isMobile ? 11 : 14; 
            
            // Format the labels to wrap on multiple lines
            const wrappedLabels = formatLabels(chartData.labels);

            if (myChart) {
                myChart.destroy();
            }

            myChart = new Chart(ctx, {
                type: 'bar', 
                data: {
                    labels: wrappedLabels, // Use the wrapped labels
                    datasets: [
                        {
                            label: '1st Choice',
                            data: chartData.firstChoice,
                            backgroundColor: '#384AD3', 
                            borderRadius: 4,
                            barPercentage: 0.7, // Make bars slightly thinner to fit better
                        },
                        {
                            label: '2nd Choice',
                            data: chartData.secondChoice,
                            backgroundColor: '#95A4F7', 
                            borderRadius: 4,
                            barPercentage: 0.7,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Allows chart to fill the box height
                    indexAxis: 'y', 
                    layout: {
                        padding: {
                            left: 0,
                            right: 10, // Add breathing room on the right
                            top: 0,
                            bottom: 0
                        }
                    },
                    scales: {
                        x: {
                            stacked: true, 
                            beginAtZero: true,
                            grid: { display: false } 
                        },
                        y: {
                            stacked: true, 
                            grid: { display: false },
                            ticks: {
                                color: '#000000',
                                font: {
                                    size: fontSize,    // Dynamic size
                                    weight: 'bold',
                                    family: 'Arial'
                                },
                                autoSkip: false // Ensure all labels are shown
                            }
                        }
                    },
                    plugins: {
                        legend: { 
                            position: 'bottom',
                            labels: {
                                color: '#000000',
                                font: { size: 12 },
                                boxWidth: 12 // Smaller colored box in legend
                            }
                        },
                        tooltip: {
                            enabled: true // Allows users to tap bars to see exact numbers
                        }
                    }
                }
            });
        }
    </script>
</body>
</html>
