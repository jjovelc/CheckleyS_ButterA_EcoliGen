# eColi Shiny App

The **eColi Shiny App** is an interactive web application built using R's Shiny framework. It allows users to explore and analyze *Escherichia coli* genomic data stored in an SQLite database. The app provides tools for querying, visualization, and plotting of genomic assemblies in a user-friendly interface.

---

## Features

- **Interactive Visualizations**: Generate dynamic plots from genomic data.
- **Custom Queries**: Run SQL-based queries on an SQLite database.
- **Modular Architecture**: Organized Shiny modules for easier maintenance and scaling.

---

## Directory Structure

```
eColi_ShinyApp/
├── .Rproj.user/                # RStudio project settings
├── data/assemblies/           # E. coli assembly data files
├── ecoli_python_venv/         # Python virtual environment
├── modules/                   # Shiny app UI/server modules
├── utils/                     # Helper and utility scripts
├── www/                       # Static assets (CSS, images)
├── .RData                     # R workspace image
├── .Rhistory                  # Command history
├── BGviewerCase.txt           # Supporting text content
├── app.R                      # Main app entry point
├── eColi_ShinyApp.Rproj       # RStudio project file
├── globals.R                  # Global variables/config
├── home.md                    # Markdown documentation
├── plotting_functions.R       # Plotting-related functions
├── query_functions.R          # SQL query helper functions
├── server.R                   # Server logic
└── ui.R                       # User interface definition
```

---

## Getting Started

### Prerequisites

- R and RStudio installed
- Required R packages (see below)
- [Optional] Python and virtualenv if needed

### Clone the Repository

```bash
git clone https://github.com/jjovelc/CheckleyS_ButterA_EcoliGen.git
cd CheckleyS_ButterA_EcoliGen/SQLite_database/eColi_ShinyApp
```

### Launch the App

1. Open `eColi_ShinyApp.Rproj` in RStudio.
2. Run the `app.R` file, or click **Run App** in the RStudio UI.

---

## Dependencies

### R Packages

Install required R packages (example list):

```r
install.packages(c("shiny", "DBI", "RSQLite", "ggplot2", "dplyr"))
```

Additional packages may be listed in `app.R`, `server.R`, or `ui.R`.

### Python Environment (Optional)

A Python virtual environment is included in `ecoli_python_venv/`. If relevant to your workflow:

```bash
source ecoli_python_venv/bin/activate
# install packages if needed
```

---

## Contributing

Contributions are welcome! Please fork the repository, create a feature branch, and open a pull request.

---

## License

[GPLv3] (https://www.gnu.org/licenses/gpl-3.0.html)  

---

## Acknowledgments

This app is part of the [CheckleyS_ButterA_EcoliGen](https://github.com/jjovelc/CheckleyS_ButterA_EcoliGen) project.

