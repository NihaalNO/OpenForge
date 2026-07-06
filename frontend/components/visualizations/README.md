# OpenForge Interactive Wireframe System

OpenForge teaches visually first. These components replace list-heavy roadmap, journey, architecture, procedure, and decision sections with structured, interactive wireframes.

## Components

- `InteractiveRoadmap`: horizontal milestones, progress, expansion, and status.
- `ProcedureFlow`: connected task steps with active detail panels, duration, dependencies, and completion state.
- `PathVisualization`: short learning, user, reading, writing, and contributor paths.
- `ExplorableGraph`: SVG-based architecture and knowledge graph with pan, zoom, node selection, collapse, hover/selection context, and dependency tracing.
- `DecisionFlow`: reasoning paths for recommendations.

## Data Shape

All components accept typed JSON-like data. Keep page code responsible for deriving repository-specific data, then pass arrays of `FlowMilestone`, `ProcedureStep`, `FlowPathStep`, `GraphNode`, and `GraphEdge`.

## Manual Testing Checklist

- Check light and dark mode contrast.
- Navigate each component by keyboard and confirm focus rings are visible.
- Verify mobile widths around 375px, tablet at 768px, desktop at 1024px and 1440px.
- Confirm long repository paths wrap without overlapping controls.
- Confirm graph zoom, pan, node selection, dependency highlighting, expand, and collapse all work.
- Confirm reduced motion remains usable; animations are transform/opacity/height transitions only.
