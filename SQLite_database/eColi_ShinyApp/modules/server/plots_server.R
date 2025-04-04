source("globals.R")

plots_server <- function(input, output, session) {
  # Load database connection from global environment
  con <- get("con", envir = .GlobalEnv)
  req(con)
  
  # Reactive expression to generate the AMR pivot table when the plot button is clicked
  amr_data <- eventReactive(input$plot, {
    req(input$table_select)
    
    # Determine the appropriate table and gene column based on the selected table
    if (input$table_select == "resFinder_results") {
      table_name <- "resFinder_results"
      gene_column <- "resistance_gene"
      where_clause <- ""
    } else if (input$table_select == "amrp_results") {
      table_name <- "amrp_results"
      gene_column <- "gene_symbol"
      where_clause <- ""
    } else if (input$table_select == "amrcore_results") {
      table_name <- "amrp_results"  # Use amrp_results table
      gene_column <- "gene_symbol"
      where_clause <- "WHERE scope = 'core'"  # Include only rows where scope == 'core'
    } else {
      showNotification("Invalid table selection.", type = "error")
      return(NULL)
    }
    
    # SQL query to select necessary columns, including the WHERE clause if applicable
    query <- paste0("SELECT sample_id, ", gene_column, " FROM ", table_name, " ", where_clause)
    
    # Read data into a data frame
    df <- dbGetQuery(con, query)
    
    # Debugging: Print the first few rows of the fetched data
    print("Fetched Data:")
    print(head(df))
    
    # Check if the dataframe is empty
    if (nrow(df) == 0) {
      showNotification("No data available for the selected table.", type = "warning")
      return(NULL)
    }
    
    # Rename columns to have consistent names for plotting
    colnames(df) <- c("sample_id", "gene")
    
    # Create a pivot table with gene as rows and sample_id as columns
    pivot_df <- reshape2::dcast(df, gene ~ sample_id, fun.aggregate = length, value.var = "gene", fill = 0)
    
    # Debugging: Print the first few rows of the pivot table
    print("Pivot Table:")
    print(head(pivot_df))
    
    return(pivot_df)
  })
  
  # Reactive expression to get sample metadata
  sample_metadata <- reactive({
    query <- "SELECT * FROM samples"
    metadata <- dbGetQuery(con, query)
    
    # Debugging: Print the first few rows of the metadata
    print("Sample Metadata:")
    print(head(metadata))
    
    # Handle missing columns gracefully
    if (!"source" %in% colnames(metadata)) {
      metadata$source <- "Unknown"
    }
    if (!"mash_group" %in% colnames(metadata)) {
      metadata$mash_group <- "Unknown"
    }
    
    return(metadata)
  })
  
  # Define a reactive function to hold data deployed in plot
  
  merged_data <- reactive({
    pivot_df <- amr_data()
    if (is.null(pivot_df)) return(NULL)
    
    metadata <- sample_metadata()
    
    # Melt the pivot table for ggplot
    melted_data <- reshape2::melt(pivot_df, id.vars = 'gene')
    colnames(melted_data) <- c('AMR', 'Sample', 'Count')
    
    # Merge metadata with melted data using 'Sample' and 'sample_id'
    merged_data <- merge(melted_data, metadata, by.x = "Sample", by.y = "sample_id", all.x = TRUE)
    
    # Arrange data for plotting
    merged_data <- merged_data %>%
      arrange(source, Sample)
    
    return(merged_data)
  })
  
  # Function to generate the combined plot with adjustable heights
  generate_combined_plot <- function(for_download = FALSE) {
    merged_data <- merged_data()
    if (is.null(merged_data) || nrow(merged_data) == 0) {
      showNotification("No data available after merging with metadata.", type = "warning")
      return(NULL)
    }
    
    pivot_df <- amr_data()
    if (is.null(pivot_df)) return(NULL)
    
    metadata <- sample_metadata()
    
    # Melt the pivot table for ggplot
    melted_data <- reshape2::melt(pivot_df, id.vars = 'gene')
    colnames(melted_data) <- c('AMR', 'Sample', 'Count')
    
    # Debugging: Print the first few rows of the melted data
    print("Melted Data:")
    print(head(melted_data))
    
    # Merge metadata with melted data using 'Sample' and 'sample_id'
    merged_data <- merge(melted_data, metadata, by.x = "Sample", by.y = "sample_id", all.x = TRUE)
    
    # Debugging: Print the first few rows after merging
    print("Merged Data:")
    print(head(merged_data))
    
    # Check if merged data is empty
    if (nrow(merged_data) == 0) {
      showNotification("No data available after merging with metadata.", type = "warning")
      return(NULL)
    }
    
    # Arrange data for plotting
    merged_data <- merged_data %>%
      arrange(source, Sample)  # First by 'source', then by 'Sample' within each 'source'
    
    # Ensure the Sample factor levels are in the sorted order
    merged_data$Sample <- factor(merged_data$Sample, levels = unique(merged_data$Sample))
    
    # Create color palettes
    unique_sources <- unique(merged_data$source)
    source_colors <- setNames(
      RColorBrewer::brewer.pal(min(8, length(unique_sources)), "Dark2"),
      unique_sources
    )
    
    unique_mash_groups <- unique(merged_data$mash_group)
    mash_group_colors <- setNames(
      RColorBrewer::brewer.pal(min(8, length(unique_mash_groups)), "Set3"),
      unique_mash_groups
    )
    
    # Create the tilemap
    tilemap <- ggplot(merged_data, aes(x = Sample, y = AMR, fill = as.factor(Count))) +
      geom_tile_interactive(aes(tooltip = paste("Sample:", Sample, "<br>Gene:", AMR, "<br>Count:", Count)), color = "gray") +
      scale_fill_manual(
        values = c("0" = "white", "1" = "dodgerblue", "2" = "red", "3" = "limegreen", "4" = "black"),
        name = "Count"
      ) +
      theme_bw() +
      theme(
        axis.text.x = element_blank(),
        axis.ticks.x = element_blank(),
        axis.text.y = element_text(size = 10),
        axis.title.x = element_text(size = 12),
        axis.title.y = element_text(size = 12),
        legend.position = "right",
        legend.text = element_text(size = 14),
        legend.title = element_text(size = 16),
        plot.margin = margin(5, 5, 10, 10)
      ) +
      labs(x = NULL, y = "Resistance Genes")
    
    # Create the abundance histogram
    abundance_data <- merged_data %>% 
      group_by(Sample) %>% 
      summarise(Abundance = sum(Count))
    
    abundance_data$Sample <- factor(abundance_data$Sample, levels = levels(merged_data$Sample))
    
    histogram <- ggplot(abundance_data, aes(x = Sample, y = Abundance)) +
      geom_bar_interactive(aes(tooltip = paste("Sample:", Sample, "<br>Abundance:", Abundance)), stat = "identity", fill = "orange1") +
      theme_bw() +
      theme(
        axis.text.x = element_blank(),
        axis.ticks.x = element_blank(),
        axis.text.y = element_text(size = 10),
        axis.title.x = element_blank(),
        axis.title.y = element_text(size = 12),
        plot.margin = margin(10, 10, 10, 10)
      ) +
      labs(y = "Counts")
    
    # Add Mash group and Source color bars
    mash_group_bar <- ggplot(unique(merged_data[, c("Sample", "mash_group")]), aes(x = Sample, y = 1, fill = mash_group)) +
      geom_tile_interactive(aes(tooltip = paste("Sample:", Sample, "<br>Mash Group:", mash_group)), height = 0.1) +
      scale_fill_manual(values = mash_group_colors, name = "Mash Group") +
      theme_void() +
      theme(
        legend.position = "bottom",
        legend.title = element_text(size = 14, face = "bold"),
        legend.text = element_text(size = 12)
      )
    
    source_bar <- ggplot(unique(merged_data[, c("Sample", "source")]), aes(x = Sample, y = 1, fill = source)) +
      geom_tile_interactive(aes(tooltip = paste("Sample:", Sample, "<br>Source:", source)), height = 0.1) +
      scale_fill_manual(values = source_colors, name = "Source") +
      theme_void() +
      theme(
        legend.position = "bottom",
        legend.title = element_text(size = 14, face = "bold"),
        legend.text = element_text(size = 12)
      )
    
    # Combine the plots
    combined_plot <- (histogram / tilemap / mash_group_bar / source_bar) +
      plot_layout(heights = c(5, 60, 2, 2), guides = "collect") &
      theme(
        plot.margin = margin(t = 1, b = 1, l = 10, r = 10),
        legend.position = "bottom"
      )
    
    return(combined_plot)
  }
  
  # Render the interactive plot using ggiraph

  output$amr_tilemap <- renderGirafe({
    combined_plot <- generate_combined_plot(for_download = FALSE)
    if (is.null(combined_plot)) return(NULL)
    
    x <- girafe(ggobj = combined_plot, width_svg = 15, height_svg = 10)
    x <- girafe_options(x = x,
                        opts_tooltip(opacity = .7),
                        opts_zoom(min = .5, max = 4),
                        sizingPolicy(defaultWidth = "100%", defaultHeight = "300px"),
                        opts_hover(css = "fill:red;stroke:orange;r:5pt;") )
    
  })
  
  # Download handler for the static plot
  output$download_plot <- downloadHandler(
    filename = function() {
      paste("amr_tilemap", Sys.Date(), ".png", sep = "")
    },
    content = function(file) {
      combined_plot <- generate_combined_plot(for_download = TRUE)
      if (is.null(combined_plot)) {
        showNotification("No plot available to download.", type = "error")
        return(NULL)
      }
      
      # Save the combined plot
      ggsave(file, plot = combined_plot, width = 15, height = 10, dpi = 300)
    }
  )
  
  output$download_data <- downloadHandler(
    filename = function() {
      paste("amr_data_", Sys.Date(), ".csv", sep = "")
    },
    content = function(file) {
      data_to_download <- merged_data()
      if (is.null(data_to_download) || nrow(data_to_download) == 0) {
        showNotification("No data available to download.", type = "error")
        return(NULL)
      }
      write.csv(data_to_download, file, row.names = FALSE)
    }
  )
  
}
