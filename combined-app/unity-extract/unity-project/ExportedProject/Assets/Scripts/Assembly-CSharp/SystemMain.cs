using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

public class SystemMain : Singleton<SystemMain>
{
	[SerializeField]
	private List<Component> m_systems;

	private void Awake()
	{
		if (Singleton<SystemMain>.m_instance != null)
		{
			Object.Destroy(base.gameObject);
		}
		SetSingleton();
		Object.DontDestroyOnLoad(this);
		OnGameStart();
	}

	private void Start()
	{
	}

	private void Update()
	{
		if (Input.GetKeyDown(KeyCode.R))
		{
			SceneManager.LoadScene("TestCourt");
		}
	}

	private void OnGameStart()
	{
		foreach (Component system in m_systems)
		{
			Transform transform = Object.Instantiate(system.gameObject).transform;
			transform.name = system.name;
			transform.SetParent(base.transform, true);
		}
	}
}
