"use client";

import React, { useState } from "react";
import {
  Calendar,
  Users,
  Clock,
  Heart,
  Shield,
  Target,
  FileText,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  Stethoscope,
  Pill,
  TestTube,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Info,
  Zap,
  Database,
  Timer,
  MapPin,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  UserPlus,
  Mail,
  Phone,
  BookOpen,
  UserCheck,
  Building,
  Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ClinicalTrialsViewProps {
  result: any;
  mode: "preview" | "dialog";
  height?: string;
  showTabs?: boolean;
}

const getStatusIcon = (status: string) => {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus.includes("completed")) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (normalizedStatus.includes("active") || normalizedStatus.includes("recruiting")) return <Play className="h-4 w-4 text-blue-500" />;
  if (normalizedStatus.includes("suspended") || normalizedStatus.includes("terminated")) return <XCircle className="h-4 w-4 text-red-500" />;
  if (normalizedStatus.includes("enrolling")) return <Users className="h-4 w-4 text-orange-500" />;
  return <Pause className="h-4 w-4 text-gray-500" />;
};

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus.includes("completed")) return "default";
  if (normalizedStatus.includes("active") || normalizedStatus.includes("recruiting")) return "secondary";
  if (normalizedStatus.includes("suspended") || normalizedStatus.includes("terminated")) return "destructive";
  return "outline";
};

const getPhaseBadge = (phase: string) => {
  if (!phase || phase === "N/A") return null;
  
  const phaseColors: Record<string, string> = {
    "PHASE1": "bg-blue-100 text-blue-800 border-blue-200",
    "PHASE2": "bg-green-100 text-green-800 border-green-200", 
    "PHASE3": "bg-orange-100 text-orange-800 border-orange-200",
    "PHASE4": "bg-purple-100 text-purple-800 border-purple-200",
  };

  const phaseLabel = phase.replace("PHASE", "Phase ");
  const colorClass = phaseColors[phase] || "bg-gray-100 text-gray-800 border-gray-200";
  
  return (
    <Badge variant="outline" className={colorClass}>
      <TestTube className="h-3 w-3 mr-1" />
      {phaseLabel}
    </Badge>
  );
};

export default function ClinicalTrialsView({ result, mode }: ClinicalTrialsViewProps) {
  const [copied, setCopied] = useState<string | null>(null);

  // Parse the clinical trial data
  let clinicalData: any;
  
  try {
    if (typeof result.content === 'string') {
      clinicalData = JSON.parse(result.content);
    } else {
      clinicalData = result.content;
    }
  } catch (error) {
    console.error('Failed to parse clinical trial data:', error);
    return (
      <Card className="border-l-4 border-l-red-500">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Unable to parse clinical trial data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // For preview mode, show a compact card
  if (mode === "preview") {
    return (
      <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm line-clamp-2 mb-2">
                {clinicalData.brief_title || clinicalData.official_title || "Clinical Trial"}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {clinicalData.nct_id && (
                  <Badge variant="outline" className="text-xs">
                    {clinicalData.nct_id}
                  </Badge>
                )}
                {getPhaseBadge(clinicalData.phases)}
                {clinicalData.study_type && (
                  <Badge variant="secondary" className="text-xs">
                    {clinicalData.study_type}
                  </Badge>
                )}
              </div>
            </div>
            {clinicalData.overall_status && (
              <div className="flex items-center gap-1">
                {getStatusIcon(clinicalData.overall_status)}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {clinicalData.brief_summary && (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {clinicalData.brief_summary}
            </p>
          )}
          
          <div className="grid grid-cols-1 gap-2 text-xs">
            {clinicalData.conditions && (
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-red-500" />
                <span className="truncate">{clinicalData.conditions}</span>
              </div>
            )}
            {clinicalData.enrollment_count && clinicalData.enrollment_count !== "N/A" && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-green-500" />
                <span>{clinicalData.enrollment_count} enrolled</span>
              </div>
            )}
            {clinicalData.overall_status && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-500" />
                <Badge variant={getStatusBadgeVariant(clinicalData.overall_status)} className="text-xs">
                  {clinicalData.overall_status}
                </Badge>
              </div>
            )}
          </div>

          {clinicalData.interventions && clinicalData.interventions.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-1 mb-1">
                <Pill className="h-3 w-3 text-purple-500" />
                <span className="text-xs font-medium">Interventions:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {clinicalData.interventions.slice(0, 2).map((intervention: any, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {typeof intervention === 'string' ? intervention : (intervention.name || 'Unknown')}
                  </Badge>
                ))}
                {clinicalData.interventions.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{clinicalData.interventions.length - 2} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {result.url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs w-full justify-start"
              onClick={() => window.open(result.url, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Details
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Dialog mode would show full details but we're not using it in carousel
  return null;
}