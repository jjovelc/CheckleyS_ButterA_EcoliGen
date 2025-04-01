# globals.R
library(shiny)
library(DT)
library(DBI)
library(RSQLite)
library(tidyverse)
library(shinydashboard)
library(shinythemes)
library(ggiraph)
library(ggplot2)
library(reshape2)
library(RColorBrewer)
library(patchwork)
library(htmlwidgets)
library(rtracklayer)
library(jsonlite)
library(Biostrings)

options(shiny.maxRequestSize = 5000*1024^2)

# Connect to your SQLite database
con <- dbConnect(RSQLite::SQLite(), "/Users/juanjovel/OneDrive/jj/UofC/git_repos/CheckleyS_ButterA_EcoliGen/SQLite_database/scripts/Ecoli.db")

# Get list of tables in the database
tables <- dbListTables(con)

