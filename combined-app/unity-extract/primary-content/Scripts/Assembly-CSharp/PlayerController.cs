using InControl;

public class PlayerController : PlayerActionSet
{
	public enum eDeviceId
	{
		None = -1,
		Device0 = 0,
		Device1 = 1,
		Device2 = 2,
		Device3 = 3,
		Device4 = 4,
		Device5 = 5,
		Device6 = 6,
		Device7 = 7,
		Device8 = 8,
		Device9 = 9,
		Device10 = 10,
		DeviceCount = 11,
		KeyboardA = 100,
		KeyboardCount = 101
	}

	public PlayerAction Left;

	public PlayerAction Right;

	public PlayerAction Up;

	public PlayerAction Down;

	public PlayerTwoAxisAction Direction;

	public PlayerAction Pass;

	public PlayerAction Shoot;

	public PlayerAction Jump;

	public PlayerAction Dodge;

	public PlayerAction Start;

	public PlayerAction Back;

	public PlayerAction ToggleAI;

	private eDeviceId m_deviceId = eDeviceId.None;

	private Player m_player;

	private int m_teamId = -1;

	private bool m_ready;

	public PlayerController()
	{
		Left = CreatePlayerAction("Left");
		Right = CreatePlayerAction("Right");
		Up = CreatePlayerAction("Up");
		Down = CreatePlayerAction("Down");
		Direction = CreateTwoAxisPlayerAction(Left, Right, Up, Down);
		Pass = CreatePlayerAction("Pass/Call");
		Shoot = CreatePlayerAction("Shoot/Karate");
		Jump = CreatePlayerAction("Jump");
		Dodge = CreatePlayerAction("Dodge");
		Start = CreatePlayerAction("Start");
		Back = CreatePlayerAction("Back");
		ToggleAI = CreatePlayerAction("ToggleAI");
	}

	public eDeviceId GetDeviceId()
	{
		return m_deviceId;
	}

	public Player GetPlayer()
	{
		return m_player;
	}

	public void OnAssignPlayer(Player player)
	{
		m_player = player;
	}

	public void OnSetTeam(int teamId)
	{
		m_teamId = teamId;
	}

	public int GetTeam()
	{
		return m_teamId;
	}

	public void SetReady(bool ready = true)
	{
		m_ready = ready;
	}

	public bool GetReady()
	{
		return m_ready;
	}

	public static PlayerController CreatePlayerInput(eDeviceId deviceType)
	{
		PlayerController playerController = null;
		if (deviceType < eDeviceId.DeviceCount)
		{
			return CreatePlayerInput((int)deviceType);
		}
		return CreatePlayerInputKeyboard();
	}

	private static PlayerController CreatePlayerInput(int deviceId)
	{
		PlayerController playerController = new PlayerController();
		playerController.m_deviceId = (eDeviceId)deviceId;
		playerController.Device = InputManager.Devices[deviceId];
		playerController.Left.AddDefaultBinding(InputControlType.DPadLeft);
		playerController.Right.AddDefaultBinding(InputControlType.DPadRight);
		playerController.Up.AddDefaultBinding(InputControlType.DPadUp);
		playerController.Down.AddDefaultBinding(InputControlType.DPadDown);
		playerController.Left.AddDefaultBinding(InputControlType.LeftStickLeft);
		playerController.Right.AddDefaultBinding(InputControlType.LeftStickRight);
		playerController.Up.AddDefaultBinding(InputControlType.LeftStickUp);
		playerController.Down.AddDefaultBinding(InputControlType.LeftStickDown);
		playerController.Pass.AddDefaultBinding(InputControlType.Action1);
		playerController.Dodge.AddDefaultBinding(InputControlType.Action2);
		playerController.Shoot.AddDefaultBinding(InputControlType.Action3);
		playerController.Jump.AddDefaultBinding(InputControlType.Action4);
		playerController.ToggleAI.AddDefaultBinding(InputControlType.Action4);
		playerController.Start.AddDefaultBinding(InputControlType.Action1);
		playerController.Start.AddDefaultBinding(InputControlType.Start);
		playerController.Back.AddDefaultBinding(InputControlType.Action2);
		playerController.Back.AddDefaultBinding(InputControlType.Select);
		playerController.Back.AddDefaultBinding(InputControlType.Back);
		return playerController;
	}

	private static PlayerController CreatePlayerInputKeyboard()
	{
		PlayerController playerController = new PlayerController();
		playerController.m_deviceId = eDeviceId.KeyboardA;
		playerController.Left.AddDefaultBinding(Key.LeftArrow);
		playerController.Right.AddDefaultBinding(Key.RightArrow);
		playerController.Up.AddDefaultBinding(Key.UpArrow);
		playerController.Down.AddDefaultBinding(Key.DownArrow);
		playerController.Jump.AddDefaultBinding(Key.Space);
		playerController.Pass.AddDefaultBinding(Key.C);
		playerController.Shoot.AddDefaultBinding(Key.X);
		playerController.Dodge.AddDefaultBinding(Key.Z);
		playerController.Start.AddDefaultBinding(Key.Return);
		playerController.Start.AddDefaultBinding(Key.Space);
		playerController.Start.AddDefaultBinding(Key.X);
		playerController.Start.AddDefaultBinding(Key.C);
		playerController.Back.AddDefaultBinding(Key.Escape);
		playerController.Back.AddDefaultBinding(Key.Backspace);
		playerController.Back.AddDefaultBinding(Key.Z);
		playerController.ToggleAI.AddDefaultBinding(Key.F2);
		return playerController;
	}
}
