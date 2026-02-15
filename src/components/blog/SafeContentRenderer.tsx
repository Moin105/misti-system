import { Component, ErrorInfo, ReactNode } from "react";
import { sanitizeHtml } from "@/lib/sanitize";

interface Props {
  content: string;
  className?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

class SafeContentRenderer extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Content rendering error:", error, errorInfo);
  }

  private renderContent(): string {
    try {
      const { content } = this.props;
      if (!content) return "";
      
      // Sanitize the content - DOMPurify handles Unicode/emojis correctly
      return sanitizeHtml(content);
    } catch (error) {
      console.error("Error sanitizing content:", error);
      throw error;
    }
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive font-medium">
            Unable to display this content. Please try refreshing the page.
          </p>
        </div>
      );
    }

    try {
      const sanitizedContent = this.renderContent();
      
      return (
        <div 
          className={this.props.className}
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      );
    } catch (error) {
      return (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive font-medium">
            Unable to display this content. Please try refreshing the page.
          </p>
        </div>
      );
    }
  }
}

export default SafeContentRenderer;
