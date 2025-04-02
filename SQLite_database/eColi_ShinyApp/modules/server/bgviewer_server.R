bgviewer_server <- function(input, output, session) {
  observeEvent(input$generate_map, {
    print("Generate Map button clicked.")  # Debug
    
    req(input$genome_file, input$gff_file)
    
    genome_file <- input$genome_file$datapath
    gff_file    <- input$gff_file$datapath
    
    genome <- readDNAStringSet(genome_file)
    genome_length <- sum(width(genome))
    genome_basename <- tools::file_path_sans_ext(basename(input$genome_file$name))
    
    gff_data <- import(gff_file)
    cds_data <- gff_data[gff_data$type == "CDS"]
    
    # Convert GRanges to data frame
    genes_df <- as.data.frame(cds_data)
    
    # Create the genes data frame
    genes <- data.frame(
      contig = as.character(genes_df$seqnames),
      start = genes_df$start,
      end = genes_df$end,
      strand = as.character(genes_df$strand),
      attributes = genes_df$ID,
      product = genes_df$product
    )
    
    # Extract gene names from the GFF
    # First check if gene column exists directly
    if ("gene" %in% colnames(genes_df)) {
      genes$name <- genes_df$gene
    } else {
      # Try to extract from attributes
      extract_gene_name <- function(attr_string) {
        if(is.null(attr_string) || is.na(attr_string)) return("Unknown")
        
        # Check if this is the full attribute string or just ID
        if(grepl("gene=", attr_string)) {
          gene_pattern <- "gene=([^;]+)"
          gene_match <- regmatches(attr_string, regexec(gene_pattern, attr_string))
          gene_name <- unlist(gene_match)[2]
          
          if(!is.na(gene_name) && length(gene_name) > 0) {
            return(gene_name)
          }
        }
        
        # Fallback to ID or just return what we have
        return(attr_string)
      }
      
      # Try to get from a potential full attributes column
      if("attributes" %in% colnames(genes_df)) {
        genes$name <- sapply(genes_df$attributes, extract_gene_name)
      } else {
        # Just use ID as name
        genes$name <- genes$attributes
      }
    }
    
    # Make sure name is never NULL
    genes$name[is.na(genes$name)] <- "Unknown"
    
    # Print a bit of the data frame to debug
    print("First few rows of genes data frame:")
    print(head(genes))
    
    # Convert to JSON once
    genes_json <- jsonlite::toJSON(genes, auto_unbox = TRUE)
    
    print("About to convert genes to JSON")
    print(substr(genes_json, 1, 500))  # Print first 500 chars of the JSON string
    
    session$sendCustomMessage("updateGenomeMap", list(
      genes = genes_json,
      genomeLength = genome_length,
      filename = genome_basename
    ))
  })
}