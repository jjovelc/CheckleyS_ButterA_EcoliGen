// ===================================================
// GENOME MAP VISUALIZATION WITH HOVER LABELS
// ===================================================
// This script creates an interactive circular genome map visualization
// It displays genes as colored arcs on a circular track, with
// different colors for plus and minus strands
// Features:
// - Interactive hover tooltips for gene information
// - Zoom and pan functionality
// - Color customization for gene strands
// - SVG and PNG export options
// ===================================================

console.log("basic_gbmap.js loaded successfully.");
console.log("Loaded D3.js version:", d3.version);

// Listen for messages from R/Shiny with genome data
Shiny.addCustomMessageHandler("updateGenomeMap", function (data) {
  console.log("Shiny.addCustomMessageHandler triggered");
  console.log("Data received from R:", data);

  // ===================================================
  // DATA PARSING AND PREPARATION
  // ===================================================
  
  // Parse genes data from JSON if needed
  let genes = data.genes;
  if (typeof genes === "string") {
    try {
      genes = JSON.parse(genes);
    } catch (err) {
      console.error("Failed to parse genes JSON:", err);
      return;
    }
  }

  // Extract other parameters from the data object
  const genomeLength = data.genomeLength; // Total genome length for scaling
  const filename = data.filename;         // Name to display in the center

  // Log parsed data for debugging
  console.log("Parsed genome data:", genes);
  console.log("Genome length:", genomeLength);
  console.log("Genome filename:", filename);
  console.log("First gene:", genes[0]);

  try {
    // ===================================================
    // VISUALIZATION SETUP
    // ===================================================
    
    // Clear any existing visualization elements
    d3.select("#genome-map").selectAll("*").remove();

    // Get container dimensions and calculate radius
    const container = document.getElementById("genome-map");
    const containerWidth = container.offsetWidth || 800;
    const containerHeight = container.offsetHeight || 800;
    // Make radius slightly smaller than half of the container
    // to leave room for labels and controls
    const radius = Math.min(containerWidth, containerHeight) / 2 - 40;

    // ===================================================
    // ZOOM FUNCTIONALITY
    // ===================================================
    
    // Create a zoom behavior that will update the transform of the visualization
    const zoom = d3.zoom().on("zoom", (event) => {
      zoomGroup.attr("transform", event.transform);
    });

    // ===================================================
    // SVG CONTAINER CREATION
    // ===================================================
    
    // Create the main SVG container with sans-serif font family
    const svg = d3
      .select("#genome-map")
      .append("svg")
      .attr("id", "genome-svg") // ID for export functions
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .attr("font-family", "Arial, Helvetica, sans-serif") // Use sans-serif fonts
      .call(zoom); // Attach zoom behavior

    // Create a group for all elements to enable zooming together
    // Center it in the middle of the container
    const zoomGroup = svg.append("g")
      .attr("transform", `translate(${containerWidth / 2}, ${containerHeight / 2})`);

    // ===================================================
    // CIRCULAR TRACKS
    // ===================================================
    
    // Create outer circle for the genome
    zoomGroup.append("circle")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 1.5);

    // Create inner circle for gene track boundary
    zoomGroup.append("circle")
      .attr("r", radius - 20) // 20px thick gene track
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 1.5);

    // Add title in the center
    zoomGroup.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("font-size", "20px")
      .attr("font-weight", "bold")
      .attr("font-family", "Arial, Helvetica, sans-serif")
      .attr("fill", "black")
      .text(filename);

    // ===================================================
    // SCALES AND COLORS
    // ===================================================
    
    // Create angle scale to map genome positions to angles on the circle
    // 0 base position = 0 radians (top of circle)
    // genomeLength position = 2π radians (full circle)
    const angleScale = d3.scaleLinear()
      .domain([0, genomeLength])
      .range([0, 2 * Math.PI]);

    // Default colors for plus and minus strands
    // These can be changed via the color pickers
    let colors = { plus: "red", minus: "blue" };

    // ===================================================
    // GENE RENDERING
    // ===================================================
    
    // Process each gene to create arc segments
    genes.forEach((gene, index) => {
      // Calculate start and end angles from gene positions
      const startAngle = angleScale(gene.start);
      const endAngle = angleScale(gene.end);

      // Create arc path generator for this gene
      const arc = d3.arc()
        .innerRadius(radius - 20) // Inner radius of gene track
        .outerRadius(radius)      // Outer radius of gene track
        .startAngle(startAngle)
        .endAngle(endAngle);

      // Get gene name and product safely (with fallbacks)
      const geneName = gene.name || gene.attributes || "Unknown";
      const geneProduct = gene.product || "";

      // Create the visible gene arc segment
      const genePath = zoomGroup.append("path")
        .attr("d", arc)
        .attr("fill", gene.strand === "+" ? colors.plus : colors.minus)
        .attr("stroke", "none") // No stroke for cleaner appearance
        .attr("data-index", index); // Store index for color updates
      
      // ===================================================
      // TOOLTIP HOVER FUNCTIONALITY
      // ===================================================
      
      // Add hover events to show/hide tooltip
      genePath
        .on("mouseover", function(event) {
          // Get mouse position relative to the zoomGroup
          const [mouseX, mouseY] = d3.pointer(event, zoomGroup.node());
          
          // Create tooltip text for gene name
          zoomGroup.append("text")
            .attr("class", "tooltip-text")
            .attr("x", mouseX)
            .attr("y", mouseY)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("font-family", "Arial, Helvetica, sans-serif")
            .attr("fill", "black")
            .text(geneName);
          
          // If there's product info, add it as a second line
          if (geneProduct) {
            // Truncate long product names for better display
            const displayProduct = geneProduct.length > 25 ? 
              geneProduct.substring(0, 22) + "..." : geneProduct;
              
            zoomGroup.append("text")
              .attr("class", "tooltip-product")
              .attr("x", mouseX)
              .attr("y", mouseY + 15) // 15px below gene name
              .attr("text-anchor", "middle")
              .attr("font-size", "10px")
              .attr("font-family", "Arial, Helvetica, sans-serif")
              .attr("fill", "#333")
              .text(displayProduct);
          }
        })
        .on("mouseout", function() {
          // Remove tooltip elements when mouse leaves
          zoomGroup.selectAll(".tooltip-text").remove();
          zoomGroup.selectAll(".tooltip-product").remove();
        });
    });

    // ===================================================
    // LEGEND AND COLOR PICKERS
    // ===================================================
    
    // Add legend with color pickers in top-left corner
    const legend = zoomGroup.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${-containerWidth / 2 + 20}, ${-containerHeight / 2 + 20})`);

    // --- Plus strand legend ---
    // Color rectangle
    const plusRect = legend.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", colors.plus);

    // Label
    legend.append("text")
      .attr("x", 30)
      .attr("y", 15)
      .attr("font-size", "12px")
      .attr("font-family", "Arial, Helvetica, sans-serif")
      .attr("fill", "black")
      .text("Plus strand (+)");

    // Color picker
    legend.append("foreignObject")
      .attr("x", 0)
      .attr("y", 25)
      .attr("width", 120)
      .attr("height", 40)
      .append("xhtml:div")
      .html(`<input type="color" id="plus-color-picker" value="${colors.plus}" />`);

    // --- Minus strand legend ---
    // Color rectangle
    const minusRect = legend.append("rect")
      .attr("x", 0)
      .attr("y", 70)
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", colors.minus);

    // Label
    legend.append("text")
      .attr("x", 30)
      .attr("y", 85)
      .attr("font-size", "12px")
      .attr("font-family", "Arial, Helvetica, sans-serif")
      .attr("fill", "black")
      .text("Minus strand (-)");

    // Color picker
    legend.append("foreignObject")
      .attr("x", 0)
      .attr("y", 95)
      .attr("width", 120)
      .attr("height", 40)
      .append("xhtml:div")
      .html(`<input type="color" id="minus-color-picker" value="${colors.minus}" />`);

    // ===================================================
    // COLOR PICKER EVENT HANDLERS
    // ===================================================
    
    // Add event listener for plus strand color picker
    document.getElementById("plus-color-picker").addEventListener("input", function () {
      const newColor = this.value;
      colors.plus = newColor;
      plusRect.attr("fill", newColor);

      // Update all plus strand genes with new color
      svg.selectAll("path")
        .filter(function() {
          const dataIndex = d3.select(this).attr("data-index");
          return genes[dataIndex] && genes[dataIndex].strand === "+";
        })
        .attr("fill", newColor);
    });

    // Add event listener for minus strand color picker
    document.getElementById("minus-color-picker").addEventListener("input", function () {
      const newColor = this.value;
      colors.minus = newColor;
      minusRect.attr("fill", newColor);

      // Update all minus strand genes with new color
      svg.selectAll("path")
        .filter(function() {
          const dataIndex = d3.select(this).attr("data-index");
          return genes[dataIndex] && genes[dataIndex].strand === "-";
        })
        .attr("fill", newColor);
    });

    // ===================================================
    // EXPORT PREPARATION
    // ===================================================
    
    // Function to prepare SVG for download
    function prepareForDownload() {
      // Make sure colors are correctly set
      plusRect.attr("fill", colors.plus);
      minusRect.attr("fill", colors.minus);
      
      // Remove any tooltips that might be showing
      zoomGroup.selectAll(".tooltip-text").remove();
      zoomGroup.selectAll(".tooltip-product").remove();
      
      // Ensure all text is using sans-serif fonts for export
      svg.selectAll("text").attr("font-family", "Arial, Helvetica, sans-serif");
    }

    // ===================================================
    // EXPORT BUTTONS
    // ===================================================
    
    // Add download SVG button
    d3.select("#genome-map").append("button")
      .attr("id", "download-svg")
      .text("Download SVG")
      .style("position", "absolute")
      .style("top", "10px")
      .style("right", "150px")
      .on("click", function () {
        prepareForDownload();

        // Convert SVG to a string
        const svgElement = document.getElementById("genome-svg");
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        
        // Create a download blob
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);

        // Create and trigger a download link
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename || "genome_map"}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Clean up
      });

    // Add download PNG button
    d3.select("#genome-map").append("button")
      .attr("id", "download-png")
      .style("position", "absolute")
      .style("top", "10px")
      .style("right", "20px")
      .text("Download PNG")
      .on("click", function () {
        prepareForDownload();

        // Get the SVG element
        const svg = document.getElementById("genome-svg");
        
        // Create a canvas for rendering the PNG
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const bbox = svg.getBoundingClientRect();
        
        // Scale up for better quality
        const scale = 2; // 2x resolution for sharper image
        canvas.width = bbox.width * scale;
        canvas.height = bbox.height * scale;
        
        // Fill with white background
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.scale(scale, scale);

        // Convert SVG to an image and draw on canvas
        const svgString = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        img.onload = function () {
          context.drawImage(img, 0, 0);
          const pngDataUrl = canvas.toDataURL("image/png");
          
          // Create and trigger a download link
          const link = document.createElement("a");
          link.href = pngDataUrl;
          link.download = `${filename || "genome_map"}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
        // Handle potential UTF-8 characters in the SVG
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)));
      });

  } catch (error) {
    // Log any errors that occur during visualization creation
    console.error("Error in visualization logic:", error);
    console.error("Stack trace:", error.stack);
  }
});

// ===================================================
// CUSTOMIZATION POSSIBILITIES:
// ===================================================
// Here are some ideas for how you could extend this visualization:
//
// 1. ADD GC CONTENT TRACK:
//    - Add an inner track showing GC content variation
//    - Use a color gradient to represent GC percentage
//
// 2. ADD GENE FILTERING:
//    - Add controls to show/hide genes by function or type
//    - Implement search functionality to highlight specific genes
//
// 3. ADD ANNOTATIONS:
//    - Add ability to highlight regions of interest
//    - Add markers for notable genome features
//
// 4. IMPROVE INTERACTIVITY:
//    - Add click-to-select functionality for genes
//    - Show detailed gene information in a separate panel
//
// 5. ADD DATA EXPORT:
//    - Add ability to export selected gene data as CSV
//    - Add ability to export custom views of the genome
// ===================================================