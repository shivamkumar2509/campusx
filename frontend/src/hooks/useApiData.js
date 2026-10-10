import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, getErrorInfo } from "../utils/clubHelpers";

/**
 * Data load karne ka common hook.
 * const { data, loading, error, reload } = useApiData(() => fetchClub(id), [id]);
 * 401 aaye to token hata ke /login bhej deta hai.
 */
export default function useApiData(fetcher, deps = []) {
  const navigate = useNavigate();
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    Promise.resolve()
      .then(() => fetcherRef.current())
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        const info = getErrorInfo(err);
        if (info.status === 401) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        setState({ data: null, loading: false, error: info });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, navigate]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
