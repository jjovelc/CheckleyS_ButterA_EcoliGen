bgviewer_ui <- function(id) {
  ns <- NS(id)
  
  fluidPage(
    tags$head(
      tags$link(rel = "stylesheet", type = "text/css", href = "styles.css"),
      tags$script(src = "https://d3js.org/d3.v6.min.js"),  # Ensure correct D3.js version
      tags$script(src = "basic_gbmap.js")
    ),
    titlePanel("BGviewer"),
    sidebarLayout(
      sidebarPanel(
        fileInput(ns("genome_file"), "Upload Genome File:", accept = c(".fasta", ".fa", ".txt")),
        fileInput(ns("gff_file"), "Upload GFF File:", accept = c(".gff")),
        actionButton(ns("generate_map"), "Generate Map")
      ),
      mainPanel(
        div(
          id = "genome-map",
          style = "width: 100%; height: 80vh;"  # Responsive width and height
        )
      )
    )
  )
}
