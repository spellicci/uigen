import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "../use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-project-id" });
  });

  describe("initial state", () => {
    test("isLoading starts as false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });

  describe("signIn", () => {
    test("calls signInAction with email and password", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(signInAction).toHaveBeenCalledWith("user@example.com", "password123");
    });

    test("sets isLoading to true while signing in and resets it after", async () => {
      let resolveSignIn!: (value: { success: boolean }) => void;
      (signInAction as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((res) => { resolveSignIn = res; })
      );

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signIn("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: false });
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signInAction on failure", async () => {
      const failResult = { success: false, error: "Invalid credentials" };
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue(failResult);

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "wrongpass");
      });

      expect(returnValue).toEqual(failResult);
    });

    test("returns the result from signInAction on success", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "proj-1" }]);

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("resets isLoading even when signInAction throws", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("does not call handlePostSignIn when sign in fails", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "wrongpass");
      });

      expect(getAnonWorkData).not.toHaveBeenCalled();
      expect(getProjects).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("signUp", () => {
    test("calls signUpAction with email and password", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("user@example.com", "password123");
      });

      expect(signUpAction).toHaveBeenCalledWith("user@example.com", "password123");
    });

    test("sets isLoading to true while signing up and resets it after", async () => {
      let resolveSignUp!: (value: { success: boolean }) => void;
      (signUpAction as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((res) => { resolveSignUp = res; })
      );

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signUp("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: false });
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from signUpAction on failure", async () => {
      const failResult = { success: false, error: "Email already registered" };
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue(failResult);

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.signUp("existing@example.com", "password123");
      });

      expect(returnValue).toEqual(failResult);
    });

    test("resets isLoading even when signUpAction throws", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("user@example.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("does not call handlePostSignIn when sign up fails", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("existing@example.com", "password123");
      });

      expect(getAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — anonymous work exists with messages", () => {
    beforeEach(() => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: [{ role: "user", content: "Make a button" }],
        fileSystemData: { "/App.tsx": { type: "file", content: "export default () => <div/>" } },
      });
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "anon-project-id" });
    });

    test("creates a project with the anonymous work", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "Make a button" }],
          data: { "/App.tsx": { type: "file", content: "export default () => <div/>" } },
        })
      );
    });

    test("project name includes a time string", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      const callArg = (createProject as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.name).toMatch(/^Design from .+/);
    });

    test("clears anonymous work after creating the project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(clearAnonWork).toHaveBeenCalledOnce();
    });

    test("redirects to the new project's route", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    });

    test("does not call getProjects when anonymous work exists", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(getProjects).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — anonymous work has no messages", () => {
    beforeEach(() => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
    });

    test("falls through to getProjects when anon work has empty messages", async () => {
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "existing-proj" }]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(getProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-proj");
    });
  });

  describe("handlePostSignIn — no anonymous work, projects exist", () => {
    beforeEach(() => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
    });

    test("redirects to the most recent project", async () => {
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "recent-proj" },
        { id: "older-proj" },
      ]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/recent-proj");
    });

    test("does not create a project when existing projects are found", async () => {
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "recent-proj" }]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(createProject).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — no anonymous work, no projects", () => {
    beforeEach(() => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "brand-new-id" });
    });

    test("creates a new empty project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [],
          data: {},
        })
      );
    });

    test("new project name matches expected pattern", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      const callArg = (createProject as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.name).toMatch(/^New Design #\d+$/);
    });

    test("redirects to the newly created project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/brand-new-id");
    });

    test("works identically through signUp", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("newuser@example.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/brand-new-id");
    });
  });
});
