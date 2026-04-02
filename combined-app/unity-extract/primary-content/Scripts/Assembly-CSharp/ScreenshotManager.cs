using System.Collections;
using System.IO;
using UnityEngine;

public class ScreenshotManager : Singleton<ScreenshotManager>
{
	[SerializeField]
	private string m_saveDirectory = "Screenshots";

	[SerializeField]
	private bool m_captureUI = true;

	[SerializeField]
	private int m_multiplier = 2;

	private void Awake()
	{
		SetSingleton();
	}

	private IEnumerator CaptureScreen(bool showUI)
	{
		Singleton<SystemUI>.Get.GetComponentInChildren<Camera>().enabled = showUI;
		Directory.CreateDirectory(m_saveDirectory);
		int screenshotIndex;
		for (screenshotIndex = 1; File.Exists(GetScreenshotName(screenshotIndex)); screenshotIndex++)
		{
		}
		yield return new WaitForEndOfFrame();
		Application.CaptureScreenshot(GetScreenshotName(screenshotIndex), m_multiplier);
		yield return null;
		Singleton<SystemUI>.Get.GetComponentInChildren<Camera>().enabled = true;
	}

	private string GetScreenshotName(int screenshotIndex)
	{
		return m_saveDirectory + Path.DirectorySeparatorChar + Application.productName + "_" + screenshotIndex.ToString("D3") + ".png";
	}
}
