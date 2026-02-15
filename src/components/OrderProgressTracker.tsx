import { Clock, Package, CheckCircle, XCircle } from "lucide-react";

interface OrderProgressTrackerProps {
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  showLabels?: boolean;
}

const OrderProgressTracker = ({ status, showLabels = true }: OrderProgressTrackerProps) => {
  const stages = [
    { key: 'pending', label: 'Order Placed', icon: Clock },
    { key: 'processing', label: 'Processing', icon: Package },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
  ];

  const getProgressPercentage = () => {
    switch (status) {
      case 'pending':
        return 0;
      case 'processing':
        return 50;
      case 'completed':
        return 100;
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  };

  const isStageActive = (stageKey: string) => {
    if (status === 'cancelled') return false;
    
    const stageOrder = ['pending', 'processing', 'completed'];
    const currentIndex = stageOrder.indexOf(status);
    const stageIndex = stageOrder.indexOf(stageKey);
    
    return stageIndex <= currentIndex;
  };

  const isCurrentStage = (stageKey: string) => {
    return status === stageKey;
  };

  if (status === 'cancelled') {
    return (
      <div className="relative p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-destructive/30">
        {/* Gradient top accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-destructive/50 to-transparent rounded-t-xl" />
        
        <div className="flex items-center justify-between mb-2">
          {stages.map((stage, index) => {
            const Icon = XCircle;
            return (
              <div key={stage.key} className="flex flex-col items-center flex-1">
                <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-destructive/20 border-2 border-destructive/40 backdrop-blur-sm">
                  <Icon className="w-5 h-5 text-destructive" />
                </div>
                {showLabels && (
                  <span className="text-xs text-muted-foreground mt-2 line-through">
                    {stage.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Progress bar - cancelled state */}
        <div className="absolute top-[calc(1rem+1.25rem)] left-4 right-4 h-1 -z-0 mx-5">
          <div className="w-full h-full bg-destructive/20 rounded-full" />
        </div>
        
        <div className="text-center mt-3">
          <span className="text-sm font-medium text-destructive">Order Cancelled</span>
        </div>
      </div>
    );
  }

  const progressPercentage = getProgressPercentage();

  return (
    <div className="relative p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/40">
      {/* Gradient top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent rounded-t-xl" />
      
      <div className="flex items-center justify-between mb-2">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = isStageActive(stage.key);
          const isCurrent = isCurrentStage(stage.key);
          
          return (
            <div key={stage.key} className="flex flex-col items-center flex-1">
              <div 
                className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-500 backdrop-blur-sm ${
                  isActive
                    ? isCurrent
                      ? status === 'pending'
                        ? 'bg-orange-500/90 border-orange-500 shadow-lg shadow-orange-500/50'
                        : status === 'processing'
                        ? 'bg-yellow-500/90 border-yellow-500 shadow-lg shadow-yellow-500/50'
                        : 'bg-green-500/90 border-green-500 shadow-lg shadow-green-500/50'
                      : 'bg-green-500/90 border-green-500'
                    : 'bg-muted/30 border-muted/50'
                }`}
              >
                {isActive ? (
                  isCurrent && status !== 'completed' ? (
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-white" />
                  )
                ) : (
                  <Icon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              {showLabels && (
                <span className={`text-xs mt-2 transition-colors duration-300 ${
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}>
                  {stage.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Progress bar background */}
      <div className="absolute top-[calc(1rem+1.25rem)] left-4 right-4 h-1 -z-0 mx-5">
        <div className="w-full h-full bg-muted/30 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderProgressTracker;
