-- ============================================
-- Add Follow Request Notification Triggers
-- ============================================

-- ============================================
-- Function: Auto-create notification on follow request
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_follow_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id)
  VALUES (NEW.requested_id, 'follow_request', NEW.requester_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_request_created ON public.follow_requests;
CREATE TRIGGER on_follow_request_created
  AFTER INSERT ON public.follow_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_follow_request_notification();

-- ============================================
-- Function: Auto-create notification on follow request approval
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_follow_accept_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification when status changes to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO public.notifications (user_id, type, actor_id)
    VALUES (NEW.requester_id, 'follow_accept', NEW.requested_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_request_updated ON public.follow_requests;
CREATE TRIGGER on_follow_request_updated
  AFTER UPDATE ON public.follow_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_follow_accept_notification();
