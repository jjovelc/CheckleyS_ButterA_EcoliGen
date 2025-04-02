// Genome Map Visualization with hover labels
// For use with Shiny applications

console.log("basic_gbmap.js loaded successfully.");
console.log("Loaded D3.js version:", d3.version);

Shiny.addCustomMessageHandler("updateGenomeMap", function (data) {
  console.log("Shiny.addCustomMessageHandler triggered");
  console.log("Data received from R:", data);

  let genes = data.genes;
  if (typeof genes === "string") {
    try {
      genes = JSON.parse(genes);
    } catch (err) {
      console.error("Failed to parse genes JSON:", err);
      return;
    }
  }

  const genomeLength = data.genomeLength;
  const filename = data.filename;

  console.log("Parsed genome data:", genes);
  console.log("Genome length:", genomeLength);
  console.log("Genome filename:", filename);
  console.log("First gene:", genes[0]);

  try {
    // Clear any existing visualization
    d3.select("#genome-map").selectAll("*").remove();

    // Set up dimensions
    const container = document.getElementById("genome-map");
    const containerWidth = container.offsetWidth || 800;
    const containerHeight = container.offsetHeight || 800;
    //const radius = Math.min(containerWidth, containerHeight) / 2 - 40;
    const radius = Math.min(containerWidth, containerHeight) / 2.5;

    // Create zoom behavior
    const zoom = d3.zoom().on("zoom", (event) => {
      zoomGroup.attr("transform", event.transform);
    });

    // Create SVG container
    const svg = d3
      .select("#genome-map")
      .append("svg")
      .attr("id", "genome-svg")
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .attr("viewBox", `-${containerWidth/2} -${containerHeight/2} ${containerWidth} ${containerHeight}`)
      .call(zoom);

    // Create a group for all elements that should zoom together
    const zoomGroup = svg.append("g")
      .attr("transform", `translate(${containerWidth / 2}, ${containerHeight / 2})`);

    // Add outer circle
    zoomGroup.append("circle")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 1.5);

    // Add inner circle
    zoomGroup.append("circle")
      .attr("r", radius - 20)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 1.5);

    // Add title
    zoomGroup.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("font-size", "20px")
      .attr("font-weight", "bold")
      .attr("fill", "black")
      .text(filename);

    // Create angle scale to map gene positions to angles
    const angleScale = d3.scaleLinear()
      .domain([0, genomeLength])
      .range([0, 2 * Math.PI]);

    // Set default colors
    let colors = { plus: "red", minus: "blue" };

    // Process each gene to create the visualization
    genes.forEach((gene) => {
      const startAngle = angleScale(gene.start);
      const endAngle = angleScale(gene.end);

      // Create arc path generator
      const arc = d3.arc()
        .innerRadius(radius - 20)
        .outerRadius(radius)
        .startAngle(startAngle)
        .endAngle(endAngle);

      // Get gene name and product safely
      const geneName = gene.name || gene.attributes || "Unknown";
      const geneProduct = gene.product || "";

      // Create the visible gene segment
      const genePath = zoomGroup.append("path")
        .attr("d", arc)
        .attr("fill", gene.strand === "+" ? colors.plus : colors.minus)
        .attr("stroke", "none");
      
      // Add hover events to show/hide tooltip
      genePath
        .on("mouseover", function(event) {
          // Get mouse position for tooltip placement
          const [mouseX, mouseY] = d3.pointer(event, zoomGroup.node());
          
          // Calculate midpoint angle for reference
          const midAngle = (startAngle + endAngle) / 2;
          
          // Position tooltip near the mouse cursor
          const tooltipX = mouseX;
          const tooltipY = mouseY;
          
          // Create tooltip (without background rectangle)
          // Create tooltip text (gene name)
          zoomGroup.append("text")
            .attr("class", "tooltip-text")
            .attr("x", tooltipX)
            .attr("y", tooltipY)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", "black")
            .text(geneName);
          
          // If there's product info, add it as a second line
          if (geneProduct) {
            // Truncate long product names
            const displayProduct = geneProduct.length > 25 ? 
              geneProduct.substring(0, 22) + "..." : geneProduct;
              
            zoomGroup.append("text")
              .attr("class", "tooltip-product")
              .attr("x", tooltipX)
              .attr("y", tooltipY + 15)
              .attr("text-anchor", "middle")
              .attr("font-size", "10px")
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

    // Add legend with color pickers
    const legend = zoomGroup.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${-containerWidth / 2 + 20}, ${-containerHeight / 2 + 20})`);

    // Plus strand legend
    const plusRect = legend.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", colors.plus);

    legend.append("text")
      .attr("x", 30)
      .attr("y", 15)
      .attr("font-size", "12px")
      .attr("fill", "black")
      .text("Plus strand (+)");

    legend.append("foreignObject")
      .attr("x", 0)
      .attr("y", 25)
      .attr("width", 120)
      .attr("height", 40)
      .append("xhtml:div")
      .html(`<input type="color" id="plus-color-picker" value="${colors.plus}" />`);

    // Minus strand legend
    const minusRect = legend.append("rect")
      .attr("x", 0)
      .attr("y", 70)
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", colors.minus);

    legend.append("text")
      .attr("x", 30)
      .attr("y", 85)
      .attr("font-size", "12px")
      .attr("fill", "black")
      .text("Minus strand (-)");

    legend.append("foreignObject")
      .attr("x", 0)
      .attr("y", 95)
      .attr("width", 120)
      .attr("height", 40)
      .append("xhtml:div")
      .html(`<input type="color" id="minus-color-picker" value="${colors.minus}" />`);

    // Add event listeners for color pickers
    document.getElementById("plus-color-picker").addEventListener("input", function () {
      const newColor = this.value;
      colors.plus = newColor;
      plusRect.attr("fill", newColor);

      svg.selectAll("path")
        .filter(function() {
          const dataIndex = d3.select(this).attr("data-index");
          return genes[dataIndex] && genes[dataIndex].strand === "+";
        })
        .attr("fill", newColor);
    });

    document.getElementById("minus-color-picker").addEventListener("input", function () {
      const newColor = this.value;
      colors.minus = newColor;
      minusRect.attr("fill", newColor);

      svg.selectAll("path")
        .filter(function() {
          const dataIndex = d3.select(this).attr("data-index");
          return genes[dataIndex] && genes[dataIndex].strand === "-";
        })
        .attr("fill", newColor);
    });

    // Function to prepare SVG for download
    function prepareForDownload() {
      // Make sure colors are correctly set
      plusRect.attr("fill", colors.plus);
      minusRect.attr("fill", colors.minus);
      
      // Remove any tooltips
      zoomGroup.selectAll(".tooltip-bg").remove();
      zoomGroup.selectAll(".tooltip-connector").remove();
      zoomGroup.selectAll(".tooltip-text").remove();
      zoomGroup.selectAll(".tooltip-product").remove();
    }

    // Add download SVG button
    d3.select("#genome-map").append("button")
      .attr("id", "download-svg")
      .text("Download SVG")
      .style("position", "absolute")
      .style("top", "10px")
      .style("right", "150px")
      .on("click", function () {
        prepareForDownload();

        const svgElement = document.getElementById("genome-svg");
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename || "genome_map"}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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

        const svg = document.getElementById("genome-svg");
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const bbox = svg.getBoundingClientRect();
        
        const scale = 2; // Increase resolution
        canvas.width = bbox.width * scale;
        canvas.height = bbox.height * scale;
        
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.scale(scale, scale);

        const svgString = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        img.onload = function () {
          context.drawImage(img, 0, 0);
          const pngDataUrl = canvas.toDataURL("image/png");
          
          const link = document.createElement("a");
          link.href = pngDataUrl;
          link.download = `${filename || "genome_map"}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)));
      });

  } catch (error) {
    console.error("Error in visualization logic:", error);
    console.error("Stack trace:", error.stack);
  }
});